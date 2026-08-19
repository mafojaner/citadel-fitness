import { supabase } from './supabase';

export type RewardStatus = 'pending' | 'granted' | 'void';

export interface ReferralSummary {
  /** The caller's own code, minted on first request. */
  code: string;
  /** People who joined using it. */
  referred: { id: string; status: RewardStatus; createdAt: string }[];
  /** The code this account itself was referred by, if any. */
  redeemedCode: string | null;
}

interface DbReferral {
  id: string;
  referrer_id: string;
  referee_id: string;
  code: string;
  reward_status: RewardStatus;
  created_at: string;
}

export async function fetchReferralSummary(userId: string): Promise<ReferralSummary> {
  // The code is minted lazily rather than at signup, so no backfill was
  // needed for accounts that existed before this feature.
  const { data: code, error: codeError } = await supabase.rpc('get_or_create_referral_code');
  if (codeError) throw codeError;

  // RLS returns rows where the caller is either side, so one query covers
  // both "who did I refer" and "was I referred".
  const { data, error } = await supabase
    .from('referrals')
    .select('id, referrer_id, referee_id, code, reward_status, created_at')
    .order('created_at', { ascending: false })
    .returns<DbReferral[]>();

  if (error) throw error;

  const rows = data ?? [];
  return {
    code: code as string,
    referred: rows
      .filter((r) => r.referrer_id === userId)
      .map((r) => ({ id: r.id, status: r.reward_status, createdAt: r.created_at })),
    redeemedCode: rows.find((r) => r.referee_id === userId)?.code ?? null,
  };
}

export async function redeemReferralCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_referral_code', { p_code: code });
  if (error) throw error;
}
