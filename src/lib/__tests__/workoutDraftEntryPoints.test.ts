/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Nothing navigates to Add Workout without first putting the day into the
 * draft.
 *
 * This is a data-loss guard. `save_workout` replaces a day's exercises
 * wholesale, so a draft that does not reflect what is already saved for
 * that date deletes the difference on the next Confirm.
 *
 * Written as a test because the failure is invisible where it is made. The
 * logging widget navigated straight to the screen and looked entirely
 * correct -- the screen opened, the date was right, nothing threw. It just
 * showed an empty day, and the exercise already logged to it would have
 * gone on the next Confirm. Nothing about writing
 * `navigate('Workouts', { screen: 'AddWorkout' })` hints otherwise, which
 * is exactly why the next entry point would do the same.
 *
 * Deliberately a low bar: it asks that the day be populated *somehow*, not
 * that a particular function be used, because there are several honest ways
 * and they are not interchangeable --
 *
 *   useOpenWorkoutDraft  reads the day from the database first; the right
 *                        default, and the only safe one when the caller
 *                        does not already know what is on the day
 *   loadFromExisting     the caller already fetched the day and is handing
 *                        it over, which is the same read done earlier
 *   loadFromProgram      a deliberate replacement with a programme's
 *                        prescription
 *   ensureDraftFor       assumes the day is empty
 *
 * A stricter rule would have to take a view on which of those each caller
 * ought to be using, and that is a judgement per screen rather than
 * something a scan can settle.
 */

const SRC = join(__dirname, '..', '..');

const NAVIGATES_TO_ADD_WORKOUT = /navigate\([^)]*['"]AddWorkout['"]/;

/** Any of the ways a caller can put a day's state into the draft. */
const POPULATES_DRAFT = /useOpenWorkoutDraft|loadFromExisting|loadFromProgram|ensureDraftFor/;

/**
 * Comments are stripped before matching. Without this the guard reports the
 * prose that explains it -- routeStore's note quotes the navigate call it
 * exists because of, and was duly flagged as an offender.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out.push(...sourceFiles(full));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function entryPoints(): { path: string; code: string }[] {
  return sourceFiles(SRC)
    .map((file) => ({
      path: file.slice(SRC.length + 1).replace(/\\/g, '/'),
      code: withoutComments(readFileSync(file, 'utf8')),
    }))
    .filter(({ code }) => NAVIGATES_TO_ADD_WORKOUT.test(code));
}

describe('Add Workout entry points', () => {
  it('populates the draft before opening the screen', () => {
    const offenders = entryPoints()
      .filter(({ code }) => !POPULATES_DRAFT.test(code))
      .map(({ path }) => path);

    expect(offenders.join('\n')).toBe('');
  });

  it('finds the entry points it is meant to be guarding', () => {
    // A guard on the guard. A pattern that stops matching -- a rename, a
    // differently-shaped navigate call -- would leave the test above
    // passing while checking nothing, which is the failure mode that
    // matters when the passing state is an empty string.
    expect(entryPoints().length).toBeGreaterThanOrEqual(3);
  });
});
