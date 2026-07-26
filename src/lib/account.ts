import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Permanently deletes the signed-in user's account via the delete-account
 * Edge Function — deleting an auth user requires the service-role key,
 * which can only ever run server-side. See
 * supabase/functions/delete-account/index.ts.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');
  if (!error) return;

  if (error instanceof FunctionsHttpError) {
    let message = 'Failed to delete account';
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // Response wasn't JSON — keep the generic message.
    }
    throw new Error(message);
  }

  throw new Error(error.message || 'Failed to delete account');
}
