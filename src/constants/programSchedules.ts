import type { Ionicons } from '@expo/vector-icons';
import { iconInk } from '../theme/tokens';

interface ProgramSchedule {
  /** How often the cycle is meant to be run, in a phrase. */
  frequency: string;
  /**
   * A worked week, Monday first: true trains, false rests.
   *
   * Seven booleans rather than the sentence this used to be. "Mon Upper A ·
   * Tue Lower A · Thu Upper B · Fri Lower B · weekend rest" is accurate and
   * is still a paragraph to parse; the same thing drawn as a week is read
   * at a glance, and the shape -- two on, one off, two on, two off -- is
   * the part that actually answers "can I fit this".
   */
  week: boolean[];
  /** What kind of training this is, for someone choosing between them. */
  suits: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

/**
 * The recommended shape of a training week, per programme.
 *
 * The screen could say a programme had three sessions and never say how
 * those three sit in a week -- whether they run back to back, whether
 * anything rests. "Day 2 of 3" is a position in a cycle, not a schedule,
 * and someone choosing between a two-day and a four-day split is asking
 * about the week, not the cycle.
 *
 * Held here rather than in the database, and that is a deliberate trade
 * rather than an oversight. This is editorial copy about how to run a
 * programme, not data any part of the app computes with: nothing sorts,
 * filters or aggregates on it. Putting it in Postgres would buy a column,
 * a migration and a fetch for a string that is only ever printed -- and
 * the programme catalogue is a fixed set of slugs seeded by migration, so
 * the two cannot drift without someone editing a migration, at which point
 * they are already in this file's neighbourhood. `programCatalogueNames`
 * guards the names; the test below guards this against the same seeds.
 */
export const PROGRAM_SCHEDULES: Record<string, ProgramSchedule> = {
  // Mon, Tue, Wed, Thu, Fri, Sat, Sun.
  'strength-5x5': {
    frequency: '3 days a week',
    week: [true, false, true, false, true, false, false],
    suits: 'Getting strong on the barbell lifts, with a day of rest between every session.',
    icon: 'barbell',
    tint: iconInk.ember,
  },
  'push-pull-legs': {
    // The six-day version, which is what the split is built for: the whole
    // cycle twice, with one day off. Run three days instead and it is every
    // other day -- the frequency line says so.
    frequency: '3 or 6 days a week',
    week: [true, true, true, false, true, true, true],
    suits: 'Training most days without hitting the same muscles twice in a row.',
    icon: 'repeat',
    tint: iconInk.violet,
  },
  'upper-lower': {
    frequency: '4 days a week',
    week: [true, true, false, true, true, false, false],
    suits: 'A hypertrophy block with two rest days and every muscle trained twice.',
    icon: 'layers',
    tint: iconInk.azure,
  },
  'full-body-3': {
    frequency: '3 days a week',
    week: [true, false, true, false, true, false, false],
    suits: 'Starting out, or coming back — everything trained three times a week.',
    icon: 'body',
    tint: iconInk.mint,
  },
  'strength-conditioning': {
    frequency: '4 days a week',
    week: [true, true, false, true, false, true, false],
    suits: 'Keeping conditioning without dropping the lifting, or the other way round.',
    icon: 'heart',
    tint: iconInk.crimson,
  },
};

/** Falls back rather than rendering nothing for a programme added later. */
export function scheduleFor(slug: string): ProgramSchedule {
  return (
    PROGRAM_SCHEDULES[slug] ?? {
      frequency: 'Run at your own pace',
      week: [true, false, true, false, true, false, false],
      suits: 'A structured cycle to follow.',
      icon: 'calendar',
      tint: iconInk.ember,
    }
  );
}
