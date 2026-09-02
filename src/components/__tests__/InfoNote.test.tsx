import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { InfoNote, InfoNoteText, InfoNoteTrigger } from '../InfoNote';
import { useState } from 'react';

/**
 * The bug this file exists for is not "the text does not appear". It appeared.
 *
 * InfoNote renders the revealed paragraph as a sibling of its icon, so the
 * paragraph takes the width of whatever holds the trigger. In the RPE column
 * header that was a fixed 46px cell, and a paragraph in a 46px box lays out
 * at its intrinsic width and runs sideways across the Reps heading and the
 * inputs under it.
 *
 * So a test asserting the text is visible would have passed before the fix
 * and after it, and proved nothing. What has to be asserted is *where* the
 * paragraph is: not inside the narrow cell.
 */

const NOTE = 'How hard the set was, out of 10.';

/** Does any ancestor of `node` constrain width the way the RPE cell does? */
function hasNarrowAncestor(node: ReturnType<typeof screen.getByText>): boolean {
  let current: typeof node | null = node;
  while (current) {
    const style = current.props?.style;
    const flat: Record<string, unknown>[] = Array.isArray(style) ? style.flat(9) : [style];
    for (const entry of flat) {
      if (entry && typeof entry === 'object' && typeof entry.width === 'number' && entry.width < 200) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

describe('InfoNote in a narrow column header', () => {
  /** The shape AddWorkoutScreen uses: trigger in the cell, text outside it. */
  function RpeHeader() {
    const [open, setOpen] = useState(false);
    return (
      <View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 46, alignItems: 'center' }}>
            <InfoNoteTrigger label="What RPE means" open={open} onPress={() => setOpen((v) => !v)}>
              <Text>RPE</Text>
            </InfoNoteTrigger>
          </View>
        </View>
        {open ? <InfoNoteText text={NOTE} /> : null}
      </View>
    );
  }

  it('does not reveal the note until asked', () => {
    render(<RpeHeader />);
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('reveals the note on a tap of the label', () => {
    render(<RpeHeader />);
    // The label is inside the tap target, so pressing the word works -- an
    // 15px icon on its own is a smaller target than a fingertip.
    fireEvent.press(screen.getByLabelText('What RPE means'));
    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  it('puts the note outside the fixed-width cell, not inside it', () => {
    render(<RpeHeader />);
    fireEvent.press(screen.getByLabelText('What RPE means'));
    expect(hasNarrowAncestor(screen.getByText(NOTE))).toBe(false);
  });

  it('hides it again on a second tap', () => {
    render(<RpeHeader />);
    fireEvent.press(screen.getByLabelText('What RPE means'));
    fireEvent.press(screen.getByLabelText('What RPE means'));
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

describe('InfoNote as a full-width block', () => {
  it('still opens and closes where it owns its own line', () => {
    render(<InfoNote label="About this date" text={NOTE} />);
    expect(screen.queryByText(NOTE)).toBeNull();
    fireEvent.press(screen.getByLabelText('About this date'));
    expect(screen.getByText(NOTE)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('About this date'));
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('reports expanded state to assistive tech', () => {
    render(<InfoNote label="About this date" text={NOTE} />);
    const trigger = screen.getByLabelText('About this date');
    expect(trigger.props.accessibilityState?.expanded).toBe(false);
    fireEvent.press(trigger);
    expect(screen.getByLabelText('About this date').props.accessibilityState?.expanded).toBe(true);
  });
});
