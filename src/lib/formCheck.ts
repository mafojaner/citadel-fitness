import { supabase } from './supabase';

/**
 * Form check: a member films a set, a coach watches it and writes back.
 *
 * Everything that decides anything lives in the database -- the tier check,
 * the monthly allowance, and the rule that a member cannot review their own
 * submission. This module uploads, calls, and types. Putting the allowance
 * here as well would be a second copy of a rule, which is how the weekly
 * digest ended up entitling a different set of people than every other
 * feature.
 */

export type FormCheckStatus = 'submitted' | 'in_review' | 'reviewed' | 'withdrawn';

export interface FormCheckSubmission {
  id: string;
  exerciseId: string | null;
  videoPath: string;
  note: string | null;
  status: FormCheckStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewerNotes: string | null;
}

export interface FormCheckQuota {
  used: number;
  allowance: number;
  remaining: number;
  resetsAt: string;
}

interface DbSubmission {
  id: string;
  exercise_id: string | null;
  video_path: string;
  note: string | null;
  status: FormCheckStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export function statusLabel(status: FormCheckStatus): string {
  switch (status) {
    case 'submitted':
      return 'Waiting for a coach';
    case 'in_review':
      return 'Being reviewed';
    case 'reviewed':
      return 'Reviewed';
    case 'withdrawn':
      return 'Withdrawn';
  }
}

/**
 * When the allowance comes back, phrased as a date rather than a countdown.
 *
 * "Resets in 12 days" is a number someone has to convert; "resets on 1
 * September" is one they can put in a calendar. The allowance is monthly, so
 * the reset is always the first of a month and the day is the useful part.
 */
export function formatQuotaReset(resetsAt: string): string {
  return new Date(resetsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export async function fetchFormCheckQuota(): Promise<FormCheckQuota> {
  const { data, error } = await supabase.rpc('form_check_quota');
  if (error) throw error;
  return data as FormCheckQuota;
}

export async function fetchFormChecks(userId: string): Promise<FormCheckSubmission[]> {
  const { data, error } = await supabase
    .from('form_check_submissions')
    .select('id, exercise_id, video_path, note, status, created_at, reviewed_at, reviewer_notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<DbSubmission[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    exerciseId: row.exercise_id,
    videoPath: row.video_path,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewerNotes: row.reviewer_notes,
  }));
}

/**
 * Uploads the video, then records the submission.
 *
 * In that order, and not in a transaction, because there is no transaction
 * that spans object storage and Postgres. The failure that matters is the
 * one where a row points at an object that is not there -- a reviewer opens
 * a submission and finds nothing -- so the object goes first. The opposite
 * failure leaves an orphaned video, which is invisible to everyone and
 * costs a few megabytes.
 */
export async function submitFormCheck({
  userId,
  uri,
  mimeType,
  exerciseId,
  note,
}: {
  userId: string;
  uri: string;
  mimeType?: string | null;
  exerciseId?: string | null;
  note?: string;
}): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const contentType = mimeType ?? blob.type ?? 'video/mp4';
  const ext = contentType.split('/')[1]?.replace('quicktime', 'mov') ?? 'mp4';
  // The folder must be the caller's own id: storage's policy checks it, and
  // submit_form_check refuses a path outside it even though that function
  // runs as its owner. Both, because either alone is one mistake away from
  // a member attaching someone else's video to their own submission.
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('form-checks')
    .upload(path, blob, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc('submit_form_check', {
    p_video_path: path,
    p_exercise_id: exerciseId ?? null,
    p_note: note ?? null,
  });

  if (error) {
    // The row is what makes the video a submission. Without it the object is
    // invisible to the reviewer and to the member, and it still counts
    // against the bucket, so it is removed rather than left behind.
    await supabase.storage.from('form-checks').remove([path]);
    throw error;
  }

  return data as string;
}

/**
 * A short-lived link to watch a submission back.
 *
 * Signed rather than public, and deliberately brief. The bucket is private
 * because these are videos of someone training in their home; a URL that
 * works forever is the same as a public bucket the moment it is shared,
 * pasted into a support ticket, or logged.
 */
export async function formCheckVideoUrl(videoPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('form-checks')
    .createSignedUrl(videoPath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

/** Gives the month's slot back; the row stays so a started review is not erased. */
export async function withdrawFormCheck(id: string): Promise<void> {
  const { error } = await supabase
    .from('form_check_submissions')
    .update({ status: 'withdrawn' })
    .eq('id', id);
  if (error) throw error;
}
