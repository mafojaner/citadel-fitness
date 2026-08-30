/// <reference types="node" />
//
// Referenced here rather than added to tsconfig's `types`, which is pinned to
// ["jest"] on purpose. This is the only file in the project that touches the
// filesystem; a React Native bundle has no `fs`, so making Node's globals
// ambient everywhere would let an import of it typecheck in a screen and
// fail on a device. @types/node is a direct devDependency so a clean install
// does not leave this resolving through somebody else's transitive copy.
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Every `insert into t (cols) values (exprs)` in the migrations must have as
 * many expressions as columns.
 *
 * This exists because of a specific outage rather than as general tidiness.
 * 20260820020000 added `rpe` to save_workout's set_entries insert, adding the
 * column to the target list but no expression to the VALUES list. Nine
 * targets, eight expressions. Postgres accepts that at CREATE FUNCTION time
 * -- plpgsql validates syntax and expressions, not the shape of an INSERT
 * against its table -- so `db push` reported success and the function then
 * failed on every call with `42601 INSERT has more target columns than
 * expressions`. Logging a workout was broken for every account on every tier
 * for six days, while typecheck, lint and the whole suite stayed green,
 * because none of them can see inside a .sql file.
 *
 * The check is deliberately dumb and syntactic. It cannot know whether an
 * expression is the *right* one -- only that a column has some expression at
 * all -- which is precisely the mistake that was made and the one a person
 * re-reading the diff is least likely to spot, since a values list of eight
 * plausible things looks fine until you count it against the nine above it.
 */

const MIGRATIONS = join(__dirname, '..', '..', '..', 'supabase', 'migrations');

/**
 * The one file allowed to fail this check: the bug that caused it.
 *
 * Applied migrations are history and do not get edited. Rewriting this one
 * would make the repo claim a broken function was never deployed, when it
 * was, for six days -- and 20260826110000 exists specifically to correct it
 * in a way that replays in the right order for a fresh environment.
 *
 * The exemption is verified rather than trusted: the test below asserts this
 * file still contains the mismatch. If someone edits it after all, the
 * exemption stops matching and has to be removed deliberately, instead of
 * quietly covering for a file it no longer describes.
 */
const KNOWN_HISTORICAL_MISMATCH = '20260820020000_set_entry_rpe.sql';

/**
 * Blanks out SQL comments, preserving length and newlines.
 *
 * Without this a `-- comment, like this one` inside a VALUES list has its
 * commas counted as separators, and a correct insert is reported as having
 * more values than columns. That is exactly what happened the first time a
 * migration explained a magic number in place: the guard cried wolf on a
 * statement that was fine, which is the failure mode most likely to get a
 * guard deleted.
 *
 * Replaced with spaces rather than removed so every offset into the string
 * still points where it did, and newlines are kept so reported line numbers
 * stay correct.
 */
function stripComments(sql: string): string {
  let out = '';
  let i = 0;
  let quote: "'" | '"' | null = null;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (quote) {
      out += ch;
      if (ch === quote && next === quote) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    // A comment only starts outside a string, which is why this sits here
    // rather than being a regex over the whole file.
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        out += sql[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }
  return out;
}

/** Split on commas that are not inside brackets, quotes or a dollar-quote. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: "'" | '"' | null = null;
  let current = '';

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quote) {
      current += ch;
      // '' inside a single-quoted string is an escaped quote, not the end.
      if (ch === quote && input[i + 1] === quote) {
        current += input[++i];
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
    } else if (ch === '(' || ch === '[') {
      depth += 1;
      current += ch;
    } else if (ch === ')' || ch === ']') {
      depth -= 1;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Reads from an opening paren to its match, returning the inside. */
function balanced(sql: string, open: number): { body: string; end: number } | null {
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      if (ch === quote && sql[i + 1] === quote) i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return { body: sql.slice(open + 1, i), end: i };
    }
  }
  return null;
}

interface Mismatch {
  file: string;
  table: string;
  columns: number;
  values: number;
  missing: string[];
}

function findMismatches(file: string, rawSql: string): Mismatch[] {
  const sql = stripComments(rawSql);
  const out: Mismatch[] = [];
  // Only the column-list form. `insert ... select` and `insert ... values`
  // without a column list have nothing to compare.
  const re = /insert\s+into\s+([a-z0-9_."]+)\s*\(/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(sql)) !== null) {
    const cols = balanced(sql, m.index + m[0].length - 1);
    if (!cols) continue;

    const after = sql.slice(cols.end + 1);
    // Must be VALUES immediately after; `insert into t (a,b) select ...`
    // and `... on conflict` are not this shape.
    const valuesAt = /^\s*values\s*\(/i.exec(after);
    if (!valuesAt) continue;

    const vals = balanced(after, valuesAt[0].length - 1);
    if (!vals) continue;

    const columnNames = splitTopLevel(cols.body);
    const valueExprs = splitTopLevel(vals.body);

    if (columnNames.length !== valueExprs.length) {
      out.push({
        file,
        table: m[1],
        columns: columnNames.length,
        values: valueExprs.length,
        missing: columnNames.slice(valueExprs.length),
      });
    }
  }
  return out;
}

describe('migration INSERT statements', () => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));

  it('finds migrations to check', () => {
    // A guard that silently checks nothing is worse than no guard, and a
    // moved directory would do exactly that.
    expect(files.length).toBeGreaterThan(40);
  });

  it('gives every insert column an expression', () => {
    const mismatches = files
      .filter((f) => f !== KNOWN_HISTORICAL_MISMATCH)
      .flatMap((f) => findMismatches(f, readFileSync(join(MIGRATIONS, f), 'utf8')));

    const report = mismatches
      .map(
        (x) =>
          `${x.file}: insert into ${x.table} has ${x.columns} columns but ${x.values} values` +
          ` (no expression for: ${x.missing.join(', ')})`
      )
      .join('\n');

    expect(report).toBe('');
  });

  it('keeps the historical exemption pointed at a real mismatch', () => {
    // Two ways this can rot: the file gets edited, or it gets deleted. Both
    // should force someone to look at the exemption rather than leaving a
    // permanent hole with a stale reason attached to it.
    expect(files).toContain(KNOWN_HISTORICAL_MISMATCH);

    const found = findMismatches(
      KNOWN_HISTORICAL_MISMATCH,
      readFileSync(join(MIGRATIONS, KNOWN_HISTORICAL_MISMATCH), 'utf8')
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ table: 'public.set_entries', columns: 9, values: 8 });
  });

  it('is superseded by a later migration that fixes it', () => {
    // The exemption is only defensible because the end state is correct.
    // Without this, a fresh environment would replay history into a broken
    // function and stay there.
    const fix = files.find((f) => f > KNOWN_HISTORICAL_MISMATCH && f.includes('save_workout'));
    expect(fix).toBeDefined();

    const sql = readFileSync(join(MIGRATIONS, fix as string), 'utf8');
    expect(findMismatches(fix as string, sql)).toEqual([]);
    expect(sql).toMatch(/create or replace function public\.save_workout/i);
  });

  it('catches the shape of the bug it was written for', () => {
    // The real 20260820020000 statement, minus p_distance_unit.
    const broken = `
      insert into public.set_entries (
        logged_exercise_id, set_number, reps, weight, weight_unit,
        duration_seconds, distance, distance_unit, rpe
      )
      values (
        v_logged_id,
        coalesce((v_set->>'set_number')::int, 1),
        coalesce((v_set->>'reps')::int, 0),
        coalesce((v_set->>'weight')::numeric, 0),
        p_weight_unit,
        (v_set->>'duration_seconds')::int,
        (v_set->>'distance')::numeric,
        (v_set->>'rpe')::numeric
      );`;

    const found = findMismatches('synthetic.sql', broken);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ table: 'public.set_entries', columns: 9, values: 8 });
    expect(found[0].missing).toEqual(['rpe']);
  });

  it('ignores commas inside a SQL comment', () => {
    // The false positive this guard produced on 20260827140000: a comment
    // explaining a magic number sat inside the VALUES list, and its own
    // commas were counted as separators.
    const commented = `
      insert into storage.buckets (id, name, public)
      values (
        'form-checks',
        'form-checks',
        -- private, unlike avatars, because these are videos of someone
        -- training at home
        false
      );`;
    expect(findMismatches('synthetic.sql', commented)).toEqual([]);
  });

  it('does not mistake a -- inside a string for a comment', () => {
    const stringy = `insert into public.t (a, b) values ('a -- not, a comment', 2);`;
    expect(findMismatches('synthetic.sql', stringy)).toEqual([]);
  });

  it('does not flag inserts that are actually fine', () => {
    // Commas inside function calls, casts and string literals must not be
    // counted as separators, or the guard cries wolf and gets deleted.
    const ok = `
      insert into public.groups (name, invite_code, owner_id)
      values (trim(p_name), upper(substr(md5(gen_random_uuid()::text), 1, 6)), v_user_id);

      insert into public.t (a, b)
      values (format('%s, %s', x, y), coalesce(z, 0));

      insert into public.t (a, b) select p, q from public.other;
    `;
    expect(findMismatches('synthetic.sql', ok)).toEqual([]);
  });
});
