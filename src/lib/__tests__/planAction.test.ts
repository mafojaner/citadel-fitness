import { planAction } from '../planAction';
import type { MembershipTier } from '../membership';

const base = { currentTier: 'free' as MembershipTier, loading: false, joined: false, openTier: null };

describe('planAction', () => {
  it('marks the plan you are actually on as current', () => {
    expect(planAction({ ...base, tier: 'free' }).kind).toBe('current');
    expect(planAction({ ...base, tier: 'fortress', currentTier: 'fortress' }).kind).toBe('current');
    expect(planAction({ ...base, tier: 'valhalla', currentTier: 'valhalla' }).kind).toBe('current');
  });

  it('marks a lower held plan as included, not as current', () => {
    // The distinction every card having a button forced: collapsing these
    // into one state labelled Free "your current plan" while the account was
    // paying for Valhalla.
    expect(planAction({ ...base, tier: 'free', currentTier: 'valhalla' }).kind).toBe('included');
    expect(planAction({ ...base, tier: 'free', currentTier: 'fortress' }).kind).toBe('included');
  });

  it('offers nothing to buy on Fortress to a Valhalla member', () => {
    // Comparison, not equality. This is the bug that would only ever hit the
    // members paying the most: being invited to join a waitlist for
    // something their plan already includes.
    expect(planAction({ ...base, tier: 'fortress', currentTier: 'valhalla' }).kind).toBe('included');
  });

  it('still offers Valhalla to a Fortress member', () => {
    const action = planAction({ ...base, tier: 'valhalla', currentTier: 'fortress' });
    expect(action).toEqual({ kind: 'button', tier: 'valhalla' });
  });

  it('offers both paid plans to a free account', () => {
    expect(planAction({ ...base, tier: 'fortress' })).toEqual({ kind: 'button', tier: 'fortress' });
    expect(planAction({ ...base, tier: 'valhalla' })).toEqual({ kind: 'button', tier: 'valhalla' });
  });

  it('waits rather than offering while the status is unknown', () => {
    // joined is false during the load, so checking it first would flash a
    // "join the waitlist" button at someone who has already joined.
    expect(planAction({ ...base, tier: 'fortress', loading: true }).kind).toBe('loading');
    expect(planAction({ ...base, tier: 'fortress', loading: true, joined: true }).kind).toBe('loading');
  });

  it('suppresses the offer on every plan once the account is on the list', () => {
    // The waitlist holds one row per person, not one per plan. Offering
    // "join the Fortress waitlist" to someone already queued for Valhalla
    // would be offering something the table cannot store.
    expect(planAction({ ...base, tier: 'fortress', joined: true }).kind).toBe('joined');
    expect(planAction({ ...base, tier: 'valhalla', joined: true }).kind).toBe('joined');
  });

  it('opens the form only on the plan that was tapped', () => {
    const open = { ...base, openTier: 'valhalla' as const };
    expect(planAction({ ...open, tier: 'valhalla' })).toEqual({ kind: 'form', tier: 'valhalla' });
    // The other paid plan keeps its button rather than opening a second form.
    expect(planAction({ ...open, tier: 'fortress' })).toEqual({ kind: 'button', tier: 'fortress' });
  });

  it('never returns a form or button for a tier that cannot be bought', () => {
    // Guards the `tier as WaitlistTier` cast: if 'free' ever reached that
    // branch it would be written to a column whose check constraint rejects
    // it, and the failure would surface as a database error at signup.
    for (const currentTier of ['free', 'fortress', 'valhalla'] as MembershipTier[]) {
      for (const openTier of [null, 'fortress', 'valhalla'] as (null | 'fortress' | 'valhalla')[]) {
        for (const loading of [true, false]) {
          for (const joined of [true, false]) {
            const action = planAction({ tier: 'free', currentTier, loading, joined, openTier });
            expect(['current', 'included']).toContain(action.kind);
          }
        }
      }
    }
  });
});

describe('planAction once billing is live', () => {
  const live = { ...base, billingLive: true };

  it('offers a purchase instead of a waitlist', () => {
    expect(planAction({ ...live, tier: 'fortress' })).toEqual({ kind: 'buy', tier: 'fortress' });
    expect(planAction({ ...live, tier: 'valhalla' })).toEqual({ kind: 'buy', tier: 'valhalla' });
  });

  it('still never offers a plan the account already holds', () => {
    // The failure that matters in the other direction: selling Fortress to
    // someone already paying for Valhalla.
    expect(planAction({ ...live, tier: 'fortress', currentTier: 'valhalla' }).kind).toBe('included');
    expect(planAction({ ...live, tier: 'valhalla', currentTier: 'valhalla' }).kind).toBe('current');
    expect(planAction({ ...live, tier: 'free' }).kind).toBe('current');
  });

  it('offers management only to someone who actually paid', () => {
    // A hand-granted tier has no store subscription behind it, so sending
    // that person to the platform's subscription settings sends them to a
    // page that has never heard of them.
    expect(
      planAction({ ...live, tier: 'valhalla', currentTier: 'valhalla', paidForThisTier: true }).kind
    ).toBe('manage');
    expect(
      planAction({ ...live, tier: 'valhalla', currentTier: 'valhalla', paidForThisTier: false }).kind
    ).toBe('current');
  });

  it('does not let a waitlist signup suppress a real purchase', () => {
    // Someone on the waitlist from before billing existed must still be able
    // to buy once it does -- otherwise the people who wanted it most are the
    // only ones who cannot pay.
    expect(planAction({ ...live, tier: 'fortress', joined: true })).toEqual({
      kind: 'buy',
      tier: 'fortress',
    });
  });

  it('falls back to the waitlist wherever billing cannot complete', () => {
    // billingLive is false on web, without the SDK, and without a key. In
    // every one of those the old behaviour has to remain intact.
    expect(planAction({ ...base, tier: 'fortress' }).kind).toBe('button');
    expect(planAction({ ...base, tier: 'fortress', joined: true }).kind).toBe('joined');
  });
});
