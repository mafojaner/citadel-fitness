# Turning billing on

Everything in this file is a step only the account holder can take. The code
side is done and inert; these are the four things that make it live, in the
order they have to happen.

## Where it stands

| Piece | State |
|---|---|
| `subscriptions` table, no client write policy | Applied to production |
| `subscription_rank` folded into `tier_rank` | Applied |
| `my_tier()` so screens and policies read one source | Applied |
| `revenuecat-webhook` | **Deployed** — v1, `verify_jwt: false` |
| `REVENUECAT_WEBHOOK_SECRET` | **Not set** — webhook refuses everything |
| RevenueCat account and four products | **Does not exist** |
| Purchase flow in the app | Written, behind one flag |
| `react-native-purchases` | **Not installed** — deliberately, see below |
| Google Play enrollment | **Approved 3 September** |
| Apple Developer Program | Not confirmed |

The webhook being deployed without its secret is the correct state, not an
oversight. With the secret unset its check is `header !== undefined`, which
no HTTP request can satisfy, so the one endpoint that can grant a paid tier
refuses everything until you configure it. Verified: a payload attempting to
grant `valhalla_annual` was posted with no header and with a wrong one, both
returned 401, and `subscriptions` still holds zero rows.

## 0. The order these have to happen in

RevenueCat does not create products. It mirrors products that already exist
in a store, so the chain runs backwards from what the dashboard suggests:

1. A build **containing the Play Billing Library** is uploaded to a Play
   track. Play refuses to let you create subscriptions until one is.
2. The four subscriptions are created **in Play Console**.
3. RevenueCat imports them and you attach entitlements and an offering.

**The build queued on 3 September does not contain the billing library.**
`react-native-purchases` is not installed (step 3 below, deliberately), and
that package is what pulls the billing library in and adds the
`com.android.vending.BILLING` permission. So that build is good for getting
the app into internal testing and in front of testers; it will not unlock
Play's subscription configuration.

What you *can* do before any of that: create the RevenueCat project, add the
Android app, connect Play, configure the webhook, and copy the publishable
key. Only product creation is gated.

## 1. Create the RevenueCat account and its products

Only you can do this — it needs an account and it connects to your App Store
Connect and Play Console.

In RevenueCat's own words you are adding an **app config**, from the **Apps**
area in the lower part of the project dashboard. Platform: Google Play Store.
It asks for three things — App name, Package Name (`com.citadelfitness.app`)
and Service Credentials.

The credentials can be the same service account `eas submit` uses
(`certs/play-service-account.json`), but RevenueCat needs **three** Play
Console account permissions that submitting does not:

- View financial data, orders, and cancellation survey responses
- Manage orders and subscriptions
- **Manage store presence** — filed under *Store presence*, not beside the
  other two, which is why it gets missed. Google uses it for in-app products;
  without it, creating or updating products in Play from RevenueCat fails.

Grant them in Play Console → Users and permissions, and add the app itself
under *App permissions*. In Google Cloud the service account also wants
**Pub/Sub Editor** and **Monitoring Viewer**, which drive Play's server
notifications (Pub/Sub Admin is the documented fallback if topic creation
errors).

**Credentials take up to 36 hours to become valid.** Until then RevenueCat
returns "Invalid Play Store credentials" as a 503 or 521 and purchases fail.
That is the documented behaviour, not a misconfiguration — regenerating the
key restarts the clock.

### You are not fully blocked while you wait

Every RevenueCat project ships with a **Test Store**: products, offerings and
a complete purchase flow with no store connected at all. Give its products
the same four ids and the whole chain — entitlement, webhook, `subscriptions`
row — can be exercised before Play has a field filled in. Which means the
`Purchases.logIn` wiring below can be *proven* rather than assumed, and that
is the one failure here with no test behind it. Swap the Test Store API key
for the Google one before shipping.

Create exactly these four product identifiers, in Play first and then
imported. They are not free-form: the app sells them by these ids and the
webhook grants entitlement by them, so a typo takes someone's money and
grants nothing.

| Product id | Grants |
|---|---|
| `fortress_monthly` | Fortress |
| `fortress_annual` | Fortress |
| `valhalla_monthly` | Valhalla |
| `valhalla_annual` | Valhalla |

The same four are listed in `src/lib/billing.ts` (`PRODUCT_IDS`) and in
`supabase/functions/revenuecat-webhook/index.ts` (`PRODUCT_TIERS`). If you
change a name, change it in all three.

Prices are already decided and live in the app: see `TIER_PRICING` in
`src/constants/featureCatalog.ts`. Note that ZAR is priced against the South
African market rather than converted from the dollar, so it is deliberately
not `USD × rate`.

## 2. Set the webhook secret

Pick a long random value, set it in **both** places, and make sure they
match:

- RevenueCat dashboard → your project → Integrations → Webhooks →
  Authorization header
- The Supabase function secret:

```bash
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET='<the value>' --project-ref ulyduorkvikeyxtpshoq
```

Point the webhook at:

```
https://ulyduorkvikeyxtpshoq.supabase.co/functions/v1/revenuecat-webhook
```

**The comparison is exact string equality**, not a bearer-token parse:

```ts
if (req.headers.get('Authorization') !== WEBHOOK_SECRET) {
```

So whatever you type into RevenueCat's Authorization field is what
`REVENUECAT_WEBHOOK_SECRET` must be, character for character. If you type
`Bearer abc123` there, the secret is the whole string including `Bearer `.
Simplest is a long random value with no prefix in both places. A mismatch is
a 401 on every event, and RevenueCat will retry them rather than lose them.

## 3. Install the SDK — with the first dev build, not before

```bash
npx expo install react-native-purchases expo-dev-client
```

**This is sequenced deliberately, and one of its reasons expired on 3
September.** `react-native-purchases` is a native module, this project has no
`expo-dev-client`, and the app currently runs on a phone through Expo Go.
Installing the SDK breaks Expo Go.

The original reason to wait was that the dev build which would replace Expo Go
could not be produced until the store enrollments finished. **Google Play has
now approved**, so that build is possible. The remaining reason still holds on
its own: steps 1, 2 and 4 are outstanding, so `billingAvailability()` would
return `{ available: false, reason: 'Purchasing is not configured yet.' }` even
with the SDK in. Installing today costs you the way the app runs on a phone and
buys nothing back.

Do it in the same change as the first dev build, and expect to run it on a
device rather than in Expo Go from that point on.

Then, in `src/lib/billing.ts`:

- flip `SDK_INSTALLED` to `true`
- fill in the two call sites marked "the SDK call goes here", in `purchase()`
  and `restore()`

**And identify the user to RevenueCat by their Supabase id.** This is the
easiest thing here to miss and it fails silently:

```ts
await Purchases.logIn(session.user.id);
```

The webhook reads `event.app_user_id` and rejects anything that is not a
uuid:

```ts
if (!/^[0-9a-f-]{36}$/i.test(userId)) {
  return json({ error: 'Unusable app_user_id' }, 400);
}
```

Without `logIn`, RevenueCat sends its own anonymous id (`$RCAnonymousID:...`),
every event is refused, and the person has paid and been granted nothing —
the exact failure the product-id contract test exists to prevent, arriving
through a different door. Rejecting is the right behaviour: writing that row
would create a subscription belonging to no account.

Those are the only two places that touch the SDK. Everything else — which
plan is offered, whether it is a purchase or a waitlist, whether a member is
offered a way to cancel — is already written and tested against
`planAction`.

## 4. Set the publishable keys

From RevenueCat → API keys. These are publishable keys and belong in the
client, in `.env.local`:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

`billingAvailability()` reads them and stays off without them, in the same
shape the telemetry wrapper uses: configured by environment, inert without
it, never guessing at a default.

## What happens then, without any further code change

`billingAvailability()` starts returning `{ available: true }` on iOS and
Android. `planAction` starts returning `buy` where it currently returns
`button`, so the waitlist CTA becomes a purchase button. `usePaidTier` starts
finding a row, so a paying member is offered **Manage subscription** — a deep
link to the platform's own settings, because both stores own cancellation and
an app cannot cancel on someone's behalf. **Restore purchases** appears,
which Apple requires.

Web keeps saying "Purchases are made in the iOS or Android app", because
there is no web storefront and a buy button on a page that cannot complete a
sale would be worse than none.

## The rule this is all built around

The app never grants itself entitlement. A purchase tells RevenueCat,
RevenueCat tells the webhook, the webhook writes `subscriptions`, and
`tier_rank` reads it. `subscriptions` has no client insert, update or delete
policy of any kind, and `profiles.membership_tier` had client writes revoked
by column privilege in `20260817120000`.

That is why the purchase handler says "your plan updates once the store
confirms it" rather than switching the tier locally. It is a slower message
and a true one.

## Before you take real money

- Sandbox purchase, restore, cancellation and expiry on both platforms.
- Confirm the free tier is unaffected throughout.
- Check the webhook's ordering guard with an out-of-order delivery: a
  cancellation emitted before a renewal but arriving after it must not revoke
  the renewal. The guard is a `.lt('event_at')` on the update, so the older
  event matches no row.
- Confirm an unknown product grants nothing rather than defaulting to a tier.
