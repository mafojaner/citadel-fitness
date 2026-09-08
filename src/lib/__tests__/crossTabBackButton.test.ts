/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A screen opened from another tab has something to go back to.
 *
 * React Navigation's nested navigate does two different things depending on
 * whether the target navigator has mounted. If it has, the screen is pushed
 * and there is history under it. If it has not -- which is the normal case
 * for a tab nobody has visited yet -- the navigate *builds* that stack's
 * initial state, and by default that state is the single target route.
 * `canGoBack()` is then false, `stackScreenOptions` renders no headerLeft,
 * and the only way off the screen is the tab bar.
 *
 * `initial: false` is the whole fix: it puts the stack's own root
 * underneath. Nothing about writing
 * `navigate('Activity', { screen: 'PersonalRecords' })` suggests it is
 * needed, which is exactly why the next link across tabs would omit it too.
 *
 * It shipped that way on the records page. From Activity the back arrow was
 * there and from Workouts it was not, so it read as flaky rather than as a
 * missing argument -- and it is invisible to anyone testing the screen from
 * the tab that owns it.
 *
 * The roots are derived rather than listed: a stack's initial route is its
 * first `Stack.Screen`, and a tab's is its `Tab.Screen` name. A navigate at
 * a root is fine as it is -- `initial: false` there would stack a duplicate
 * of the root on itself.
 */

const SRC = join(__dirname, '..', '..');

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

/**
 * Every route a navigator lands on by default: the tab names, plus the
 * first screen declared in each stack.
 */
function rootRoutes(): Set<string> {
  const roots = new Set<string>();
  const tabs = readFileSync(join(SRC, 'navigation', 'MainTabs.tsx'), 'utf8');
  for (const match of tabs.matchAll(/<Tab\.Screen\s+name="(\w+)"/g)) roots.add(match[1]);

  const stacks = join(SRC, 'navigation', 'stacks');
  for (const file of readdirSync(stacks)) {
    const first = readFileSync(join(stacks, file), 'utf8').match(/<Stack\.Screen\s+name="(\w+)"/);
    if (first) roots.add(first[1]);
  }
  return roots;
}

interface NestedNavigate {
  path: string;
  call: string;
  /** The deepest screen named, or null when it is computed at runtime. */
  target: string | null;
  hasInitialFalse: boolean;
}

/**
 * Calls of the shape `navigate('X', { screen: ... })`, including the
 * two-level `navigate('Main', { screen: tab, params: { screen } })` the
 * root-relative helpers use.
 */
function nestedNavigates(): NestedNavigate[] {
  const out: NestedNavigate[] = [];
  const call = /navigate\(\s*['"](\w+)['"]\s*,\s*(\{[\s\S]{0,320}?\})\s*(?:as never\s*)?\)/g;

  for (const file of sourceFiles(SRC)) {
    const code = withoutComments(readFileSync(file, 'utf8'));
    for (const match of code.matchAll(call)) {
      const [whole, , body] = match;
      if (!/\bscreen\s*:/.test(body)) continue;

      // The inner `params: { screen: X }` names the real destination; the
      // outer object's own `screen` is only the tab in that shape.
      const nested = body.match(/params\s*:\s*\{([\s\S]*?)\}/);
      const scope = nested ? nested[1] : body;
      const named = scope.match(/screen\s*:\s*['"](\w+)['"]/);

      out.push({
        path: file.slice(SRC.length + 1).replace(/\\/g, '/'),
        call: whole.replace(/\s+/g, ' ').slice(0, 110),
        // A dynamic screen name (`screen: shortcut.screen`) cannot be
        // resolved here, and null is treated as deep below -- the cautious
        // way round, and correct for every such call in the app today.
        target: named ? named[1] : null,
        hasInitialFalse: /initial\s*:\s*false/.test(scope),
      });
    }
  }
  return out;
}

describe('cross-tab navigation', () => {
  it('leaves a back arrow on every screen it opens', () => {
    const roots = rootRoutes();
    const offenders = nestedNavigates()
      .filter(({ target, hasInitialFalse }) => {
        if (hasInitialFalse) return false;
        // A navigate at a navigator's own default route already has the
        // history it needs -- there is nothing beneath a root.
        return target === null || !roots.has(target);
      })
      .map(({ path, call }) => `${path}: ${call}`);

    expect(offenders.join('\n')).toBe('');
  });

  it('finds the calls it is meant to be guarding', () => {
    // A guard on the guard. A regex that stops matching would leave the
    // test above passing while checking nothing, which is the failure mode
    // that matters when the passing state is an empty string.
    const calls = nestedNavigates();
    expect(calls.length).toBeGreaterThanOrEqual(8);
    expect(calls.filter((c) => c.hasInitialFalse).length).toBeGreaterThanOrEqual(4);
    expect(calls.filter((c) => c.target !== null).length).toBeGreaterThanOrEqual(4);
  });

  it('knows which routes are roots', () => {
    const roots = rootRoutes();
    // Tab names and stack initial routes, neither of which needs the flag.
    expect(roots.has('Activity')).toBe(true);
    expect(roots.has('Workouts')).toBe(true);
    expect(roots.has('Plans')).toBe(true);
    // Screens that sit below one, which do.
    expect(roots.has('PersonalRecords')).toBe(false);
    expect(roots.has('Leaderboard')).toBe(false);
  });
});
