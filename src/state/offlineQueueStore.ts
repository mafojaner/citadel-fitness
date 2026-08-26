import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  dueItems,
  enqueueSave,
  isRetriableError,
  recordFailure,
  removeFromQueue,
  stalledItems,
  type PendingSave,
  type QueuedWorkoutPayload,
} from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';

interface OfflineQueueState {
  queue: PendingSave[];
  /** True while a flush is in flight, so two triggers can't run at once. */
  flushing: boolean;
  enqueue: (date: string, payload: QueuedWorkoutPayload) => void;
  flush: () => Promise<void>;
  /** Drop an item the person has decided to abandon. */
  discard: (id: string) => void;
}

/**
 * Workout saves that could not reach the server yet.
 *
 * Persisted, because the whole point is surviving the thing that makes a
 * save fail: no signal, a backgrounded app, a phone that dies on the walk
 * home. A queue held in memory would lose exactly the workouts it exists to
 * protect.
 *
 * The decisions all live in lib/offlineQueue.ts and are tested there. This
 * holds the list, talks to Supabase, and makes sure only one flush runs at
 * a time.
 */
export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      flushing: false,

      enqueue: (date, payload) => {
        set((state) => ({
          queue: enqueueSave(state.queue, {
            id: `${date}-${Date.now()}`,
            date,
            payload,
            queuedAt: Date.now(),
            attempts: 0,
          }),
        }));
      },

      discard: (id) => set((state) => ({ queue: removeFromQueue(state.queue, id) })),

      flush: async () => {
        if (get().flushing) return;
        const due = dueItems(get().queue, Date.now());
        if (due.length === 0) return;

        set({ flushing: true });
        try {
          for (const item of due) {
            // Re-read rather than trusting the snapshot: an earlier item in
            // this loop may have taken minutes, and the person may have saved
            // that same day again in the meantime, which collapses it.
            if (!get().queue.some((q) => q.id === item.id)) continue;

            const { error } = await supabase.rpc('save_workout', item.payload as never);

            if (!error) {
              set((state) => ({ queue: removeFromQueue(state.queue, item.id) }));
              continue;
            }

            if (!isRetriableError(error)) {
              // The server rejected it rather than failing to hear it.
              // Counted straight to the cap so it stops being retried, but
              // kept, because it is still the person's workout.
              set((state) => ({
                queue: state.queue.map((q) =>
                  q.id === item.id
                    ? { ...q, attempts: Number.MAX_SAFE_INTEGER, lastError: error.message }
                    : q
                ),
              }));
              continue;
            }

            set((state) => ({
              queue: recordFailure(state.queue, item.id, error.message, Date.now()),
            }));
            // Still offline: the rest of the queue will fail the same way, so
            // stop rather than burning every item's attempt budget on one
            // dead connection.
            break;
          }
        } finally {
          set({ flushing: false });
        }
      },
    }),
    {
      name: 'citadel-fitness-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
      // `flushing` is deliberately not persisted: an app killed mid-flush
      // would rehydrate believing a flush was already running and never
      // start another one.
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);

/** How many have given up and need a decision. */
export function stalledCount(queue: PendingSave[]): number {
  return stalledItems(queue).length;
}
