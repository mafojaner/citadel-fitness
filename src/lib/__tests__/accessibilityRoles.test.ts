/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Every pressable either declares what it is, or declares that it is not a
 * control.
 *
 * React Native does not infer a role the way HTML does. A `<Pressable>` with
 * no `accessibilityRole` is announced by TalkBack and VoiceOver as whatever
 * text happens to be inside it, with no indication that it can be activated
 * -- so a calendar day reads as a bare number, a filter option reads as its
 * label with no hint that it is selectable, and a full-screen dismiss scrim
 * reads as nothing at all.
 *
 * The Aug 20 accessibility pass fixed *names* and missed *roles*, which is
 * why this exists as a test rather than as another one-off audit: names are
 * visible in the accessibility tree the moment you look, and a missing role
 * is only obvious when you listen.
 *
 * `accessible={false}` counts as a declaration. Some pressables genuinely
 * are not controls -- the wrapper inside a modal whose only job is to stop a
 * tap reaching the scrim behind it -- and hiding those from the tree is the
 * correct fix, because giving them a role would collapse the real controls
 * inside them into one announcement.
 */

const SRC = join(__dirname, '..', '..');

const PRESSABLE = /<(Pressable|TouchableOpacity|AnimatedPressable|TouchableHighlight|TouchableWithoutFeedback)\b/g;

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out.push(...tsxFiles(full));
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Returns the opening tag starting at `from`, tracking brace depth so a `>`
 * inside a JSX expression (an arrow function, a comparison) is not mistaken
 * for the end of the tag.
 */
function openingTag(source: string, from: number): string {
  let depth = 0;
  let i = from;
  while (i < source.length) {
    const c = source[i];
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) break;
    i += 1;
  }
  return source.slice(from, i);
}

interface Offender {
  file: string;
  line: number;
  component: string;
}

function findOffenders(file: string, source: string): Offender[] {
  const out: Offender[] = [];
  PRESSABLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRESSABLE.exec(source)) !== null) {
    const tag = openingTag(source, m.index);
    const declared =
      tag.includes('accessibilityRole') ||
      /accessible=\{false\}/.test(tag) ||
      // A spread may carry the role from a wrapper's props.
      /\{\.\.\./.test(tag);
    if (!declared) {
      out.push({
        file,
        line: source.slice(0, m.index).split('\n').length,
        component: m[1],
      });
    }
  }
  return out;
}

describe('pressable accessibility roles', () => {
  const files = tsxFiles(SRC);

  it('finds screens to check', () => {
    // A guard that silently checks nothing is worse than no guard.
    expect(files.length).toBeGreaterThan(20);
  });

  it('declares a role on every pressable', () => {
    const offenders = files.flatMap((f) =>
      findOffenders(f.slice(SRC.length + 1).replace(/\\/g, '/'), readFileSync(f, 'utf8'))
    );

    const report = offenders
      .map((o) => `${o.file}:${o.line} <${o.component}> has no accessibilityRole`)
      .join('\n');

    expect(report).toBe('');
  });

  it('catches a pressable that declares nothing', () => {
    const bad = '<Pressable onPress={() => go()}>\n  <Text>Save</Text>\n</Pressable>';
    expect(findOffenders('synthetic.tsx', bad)).toHaveLength(1);
  });

  it('accepts a role, and accepts an explicit opt-out', () => {
    const withRole = '<Pressable accessibilityRole="button" onPress={go}>';
    const optedOut = '<Pressable onPress={(e) => e.stopPropagation()} accessible={false}>';
    expect(findOffenders('synthetic.tsx', withRole)).toEqual([]);
    expect(findOffenders('synthetic.tsx', optedOut)).toEqual([]);
  });

  it('is not fooled by a > inside a JSX expression', () => {
    // The bug this guard would otherwise have: an arrow function in a prop
    // ends the tag early, so the accessibilityRole after it is never seen
    // and a correctly-labelled control is reported as an offender.
    const tricky =
      '<Pressable onPress={() => setCount(count > 2 ? 0 : count)} accessibilityRole="button">';
    expect(findOffenders('synthetic.tsx', tricky)).toEqual([]);
  });
});
