/// <reference types="node" />
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Every exercise a programme prescribes exists in the catalogue under that
 * exact name.
 *
 * The programme seeds join to `public.exercises` on name, and that join is
 * deliberately lossy -- the original seed chose it so a missing accessory
 * would skip rather than fail the whole migration. The cost of that choice
 * is this: a name that does not match produces no error anywhere. The
 * migration applies, the programme loads, and one movement is simply
 * absent from a day, which nobody notices until they read the session and
 * wonder where the overhead press went.
 *
 * It has already happened once. `Jump Rope` was renamed to
 * `Skipping (Jump Rope)` by a later migration, and a new conditioning day
 * written against the old name would have been seeded with one exercise
 * instead of two. Caught by looking at the running app, which is not a
 * reliable way to catch it -- a dropped accessory on day three of a
 * programme nobody is currently enrolled in would not show up at all.
 *
 * Renames are why this cannot be a plain substring search: `Jump Rope`
 * still appears in the migrations, as the *source* of that rename. The
 * catalogue is replayed below -- inserts, then renames -- so what is
 * checked against is the set of names that actually exist at the end.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

function migrationSql(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS, file), 'utf8') }));
}

/**
 * Names the catalogue ends up holding.
 *
 * Inserts are matched as a quoted name followed by a quoted category or
 * type, which is the shape every exercise seed in this repo uses. Renames
 * are then applied in file order.
 */
function catalogueNames(): Set<string> {
  const names = new Set<string>();
  const insert = /\(\s*'([^']+)'\s*,\s*'(?:chest|back|legs|shoulders|arms|core|cardio|boxing|glutes|strength)'/g;
  const rename = /update\s+public\.exercises[\s\S]{0,400}?set\s+name\s*=\s*'([^']+)'[\s\S]{0,400}?where\s+name\s*=\s*'([^']+)'/gi;

  for (const { sql } of migrationSql()) {
    for (const match of sql.matchAll(insert)) names.add(match[1]);
    for (const match of sql.matchAll(rename)) {
      const [, to, from] = match;
      if (names.delete(from)) names.add(to);
    }
  }
  return names;
}

/** Exercise names referenced by any programme seed. */
function prescribedNames(): { file: string; name: string }[] {
  const out: { file: string; name: string }[] = [];
  // The programme seed rows are ('slug', 'Day name', 'Exercise', pos, sets, reps).
  const row = /\(\s*'[a-z0-9-]+'\s*,\s*'[^']+'\s*,\s*'([^']+)'\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;

  for (const { file, sql } of migrationSql()) {
    if (!sql.includes('program_day_exercises')) continue;
    for (const match of sql.matchAll(row)) out.push({ file, name: match[1] });
  }
  return out;
}

describe('programme exercise names', () => {
  it('all exist in the catalogue', () => {
    const catalogue = catalogueNames();
    const missing = prescribedNames()
      .filter(({ name }) => !catalogue.has(name))
      .map(({ file, name }) => `${file}: ${name}`);

    expect(Array.from(new Set(missing)).join('\n')).toBe('');
  });

  it('is actually reading both sides', () => {
    // A guard on the guard. Either regex silently matching nothing would
    // leave the test above passing while comparing two empty sets, which is
    // the failure mode that matters when the passing state is an empty
    // string.
    expect(catalogueNames().size).toBeGreaterThan(100);
    expect(prescribedNames().length).toBeGreaterThan(30);
  });

  it('resolves a renamed exercise to its new name', () => {
    // The specific case that motivated this: renamed in
    // 20260101000023_boxing_and_skipping, and still present in the
    // migrations under its old name as the source of that rename.
    const catalogue = catalogueNames();
    expect(catalogue.has('Skipping (Jump Rope)')).toBe(true);
    expect(catalogue.has('Jump Rope')).toBe(false);
  });
});
