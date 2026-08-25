import { planAction } from '../planAction';
import type { MembershipTier } from '../membership';

const base = { currentTier: 'free' as MembershipTier, loading: false, joined: false, openTier: null };

describe('planAction', () => {
  it('offers nothing on the free plan', () => {
    // There is nothing to wait for on the tier everyone already has.
    expect(planAction({ ...base, tier: 'free' }).kind).toBe('none');
    expect(planAction({ ...base, tier: 'free', currentTier: 'valhalla' }).kind).toBe('none');
  });

  it('offers nothing on a plan the account already holds', () => {
    expect(planAction({ ...base, tier: 'fortress', currentTier: 'fortress' }).kind).toBe('none');
    expect(planAction({ ...base, tier: 'valhalla', currentTier: 'valhalla' }).kind).toBe('none');
  });

  it('offers nothing on Fortress to a Valhalla member', () => {
    // Comparison, not equality. This is the bug that would only ever hit the
    // members paying the most: being invited to join a waitlist for
    // something their plan already includes.
    expect(planAction({ ...base, tier: 'fortress', currentTier: 'valhalla' }).kind).toBe('none');
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
            expect(action).toEqual({ kind: 'none' });
          }
        }
      }
    }
  });
});
