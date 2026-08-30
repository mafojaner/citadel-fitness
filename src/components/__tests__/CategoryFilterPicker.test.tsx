import { render, fireEvent } from '@testing-library/react-native';
import { CategoryFilterPicker } from '../CategoryFilterPicker';
import type { Category } from '../../types/models';

/**
 * Covers the accessibility work done on this component on 27 August, which
 * was made from a source file and never listened to.
 *
 * Three things here are invisible to typecheck and lint and were all wrong
 * before that change: the options are a pick-one list whose selection is
 * carried only by a colour and a tick, the scrim that dismisses the sheet
 * announced nothing at all, and the wrapper that merely swallows taps would
 * have collapsed the whole sheet into one announcement if it had been given
 * a role instead of being hidden.
 */

const OPTIONS: readonly { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' as Category },
  { label: 'Back', value: 'back' as Category },
];

describe('CategoryFilterPicker', () => {
  it('shows the active option on the trigger', () => {
    const view = render(<CategoryFilterPicker options={OPTIONS} value="chest" onChange={() => {}} />);
    expect(view.getByLabelText('Filter: Chest')).toBeTruthy();
  });

  it('falls back to the first option when the value matches nothing', () => {
    // Guards the `?? options[0]` — a value that has been removed from the
    // list would otherwise crash on `active.label`.
    const view = render(
      <CategoryFilterPicker options={OPTIONS} value={'legs' as Category} onChange={() => {}} />
    );
    expect(view.getByLabelText('Filter: All')).toBeTruthy();
  });

  it('opens the sheet and announces the options as a pick-one list', () => {
    const view = render(<CategoryFilterPicker options={OPTIONS} value="chest" onChange={() => {}} />);
    fireEvent.press(view.getByLabelText('Filter: Chest'));

    const radios = view.getAllByRole('radio');
    expect(radios).toHaveLength(OPTIONS.length);

    const selected = radios.filter((r) => r.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('Chest');
  });

  it('reports the chosen option', () => {
    const onChange = jest.fn();
    const view = render(<CategoryFilterPicker options={OPTIONS} value="chest" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('Filter: Chest'));
    fireEvent.press(view.getByLabelText('Back'));
    expect(onChange).toHaveBeenCalledWith('back');
  });

  it('gives the dismiss scrim a name', () => {
    // The failure this prevents: a full-screen element that closes the sheet
    // and announces nothing, so the only way out is a gesture a screen
    // reader user has no reason to know about.
    const view = render(<CategoryFilterPicker options={OPTIONS} value="all" onChange={() => {}} />);
    fireEvent.press(view.getByLabelText('Filter: All'));
    expect(view.getByLabelText('Close filter menu')).toBeTruthy();
  });

  it('closes when the scrim is pressed', () => {
    const view = render(<CategoryFilterPicker options={OPTIONS} value="all" onChange={() => {}} />);
    fireEvent.press(view.getByLabelText('Filter: All'));
    expect(view.queryAllByRole('radio')).toHaveLength(OPTIONS.length);

    fireEvent.press(view.getByLabelText('Close filter menu'));
    expect(view.queryAllByRole('radio')).toHaveLength(0);
  });
});
