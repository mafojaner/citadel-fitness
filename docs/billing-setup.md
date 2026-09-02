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

The webhook being deployed without its secret is the correct state, not an
oversight. With the secret unset its check is `header !== undefined`, which
no HTTP request can satisfy, so the one endpoint that can grant a paid tier
refuses everything until you configure it. Verified: a payload attempting to
grant `valhalla_annual` was posted with no header and with a wrong one, both
returned 401, and `subscriptions` still holds zero rows.

## 1. Create the RevenueCat account and its products

Only you can do this — it needs an account and it connects to your App Store
Connect and Play Console.

Create exactly these four product identifiers. They are not free-form: the
app sells them by these ids and the webhook grants entitlement by them, so a
typo takes someone's money and grants nothing.

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

## 3. Install the SDK — with the first dev build, not before

```bash
npx expo install react-native-purchases expo-dev-client
```

**This is sequenced deliberately.** `react-native-purchases` is a native
module, this project has no `expo-dev-client`, and the app currently runs on
a phone through Expo Go. Installing the SDK breaks Expo Go, and the dev build
that would replace it cannot be produced until the store enrollments finish —
so installing early would remove the only way the app runs on a device and
give nothing back, since steps 1 and 2 are still outstanding anyway.

Then, in `src/lib/billing.ts`:

- flip `SDK_INSTALLED` to `true`
- fill in the two call sites marked "the SDK call goes here", in `purchase()`
  and `restore()`

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
