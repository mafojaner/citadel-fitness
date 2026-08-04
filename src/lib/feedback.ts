import { supabase } from './supabase';

/**
 * Saves feedback first (the durable record), then best-effort triggers an
 * immediate email. The database insert is the source of truth — a failure
 * to send email shouldn't block the user from seeing their feedback as
 * submitted, since it's already safely stored either way.
 */
export async function submitFeedback(userId: string, email: string, message: string): Promise<void> {
  const { error } = await supabase.from('feedback').insert({ user_id: userId, email, message });
  if (error) throw error;

  try {
    await supabase.functions.invoke('send-feedback-email', { body: { message } });
  } catch {
    // Swallowed intentionally — see doc comment above.
  }
}
