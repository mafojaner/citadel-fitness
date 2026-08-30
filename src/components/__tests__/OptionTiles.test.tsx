import { render, fireEvent } from '@testing-library/react-native';
import { OptionTiles, type OptionTile } from '../OptionTiles';

/**
 * The first rendering test in this project, and it exists because of a
 * specific gap rather than for coverage.
 *
 * Every other suite here tests a pure function. That has caught real
 * arithmetic bugs and has never once caught a screen that fails to render --
 * which is the failure this project keeps actually having: a stray control
 * character that crashed the Workouts tab, an undeclared `navigation` that
 * resolved to the DOM global and broke four links, a save path that
 * typechecked and lint-passed while being unable to save. Typecheck, lint
 * and 247 pure-function tests were green over all three.
 *
 * Mounting the component is what closes that. These are deliberately smoke
 * tests -- does it render, does it show what it was given, does pressing it
 * report the right value, is it announced correctly -- and deliberately not
 * snapshots. A snapshot of a component nobody has looked at only locks in
 * whatever it did the first time, including the bugs.
 */

type Mode = 'light' | 'dark' | 'system';

const OPTIONS: readonly OptionTile<Mode>[] = [
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  { label: 'System', value: 'system', icon: 'desktop-outline' },
];

const NO_ICONS: readonly OptionTile<'kg' | 'lb'>[] = [
  { label: 'Kilograms', value: 'kg' },
  { label: 'Pounds', value: 'lb' },
];

describe('OptionTiles', () => {
  it('renders every option it is given', () => {
    const view = render(<OptionTiles options={OPTIONS} value="light" onChange={() => {}} />);
    expect(view.getByText('Light')).toBeTruthy();
    expect(view.getByText('Dark')).toBeTruthy();
    expect(view.getByText('System')).toBeTruthy();
  });

  it('reports the value that was pressed, not the one that was selected', () => {
    const onChange = jest.fn();
    const view = render(<OptionTiles options={OPTIONS} value="light" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('Dark'));
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('marks exactly one tile selected, and it is the current value', () => {
    // The selected state is carried by a fill and a border -- invisible to a
    // screen reader, and to this test, unless the state is also declared.
    const view = render(<OptionTiles options={OPTIONS} value="system" onChange={() => {}} />);
    const selected = view
      .getAllByRole('radio')
      .filter((tile) => tile.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('System');
  });

  it('renders without an icon, which is the common case', () => {
    // Units tiles deliberately carry no glyph. This is here because "icon is
    // optional" is exactly the kind of prop that works until the one render
    // that omits it.
    const view = render(<OptionTiles options={NO_ICONS} value="kg" onChange={() => {}} />);
    expect(view.getByText('Kilograms')).toBeTruthy();
    expect(view.getByText('Pounds')).toBeTruthy();
  });

  it('still reports a press on the already-selected value', () => {
    const onChange = jest.fn();
    const view = render(<OptionTiles options={NO_ICONS} value="kg" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('Kilograms'));
    // The parent decides whether re-picking the current value is a no-op.
    // Swallowing it here would hide a control that had stopped responding.
    expect(onChange).toHaveBeenCalledWith('kg');
  });
});
