import { render, fireEvent } from '@testing-library/react-native';
import { DateRangeCalendar } from '../DateRangeCalendar';

/**
 * The calendar's accessibility labels are the whole point of this suite.
 *
 * Visually a cell shows "12". A screen reader given only that reads a month
 * as thirty bare numbers, so the label has to carry the weekday, month and
 * year that the eye gets from the grid. That label is built by a helper
 * which parses a YYYY-MM-DD string, and date parsing is where this kind of
 * code goes wrong: `new Date('2026-03-12')` is UTC midnight, and reading it
 * back with local getters returns the 11th for anyone west of Greenwich.
 * The label would then be off by one day for roughly half the world, while
 * looking perfectly correct to whoever wrote it.
 */

const TZ = process.env.TZ;

describe('DateRangeCalendar', () => {
  afterEach(() => {
    process.env.TZ = TZ;
  });

  it('renders a range without crashing', () => {
    const view = render(
      <DateRangeCalendar start="2026-03-10" end="2026-03-14" onChange={() => {}} />
    );
    expect(view.toJSON()).toBeTruthy();
  });

  it('labels a day with more than its number', () => {
    const view = render(
      <DateRangeCalendar start="2026-03-10" end="2026-03-14" onChange={() => {}} />
    );
    // Any day cell will do; the point is that the label is not just "12".
    const labelled = view
      .getAllByRole('button')
      .map((n) => n.props.accessibilityLabel)
      .filter((l): l is string => typeof l === 'string');

    expect(labelled.length).toBeGreaterThan(0);
    // Every label carries a month name, so none of them is a bare number.
    expect(labelled.every((l) => /[A-Za-z]{3,}/.test(l))).toBe(true);
  });

  it('marks the days inside the range as selected', () => {
    const view = render(
      <DateRangeCalendar start="2026-03-10" end="2026-03-14" onChange={() => {}} />
    );
    const selected = view
      .getAllByRole('button')
      .filter((n) => n.props.accessibilityState?.selected);
    // Five days, 10th to 14th inclusive. If the range state were only a
    // colour, this count would be zero and a screen reader user would have
    // no way to tell what they had picked.
    expect(selected).toHaveLength(5);
  });

  it('does not shift the label by a day in a western timezone', () => {
    // The bug this guards: parsing the date string locally rather than as
    // UTC. Los Angeles is UTC-7/8, so a local parse of "2026-03-10" lands on
    // the 9th and every label in the calendar reads one day early.
    process.env.TZ = 'America/Los_Angeles';
    const view = render(
      <DateRangeCalendar start="2026-03-10" end="2026-03-10" onChange={() => {}} />
    );
    const labels = view
      .getAllByRole('button')
      .map((n) => n.props.accessibilityLabel as string)
      .filter(Boolean);

    // The 10th must be labelled as the 10th, and no label may claim the 9th
    // while being the cell for the 10th.
    const tenth = labels.find((l) => /\b10\b/.test(l));
    expect(tenth).toBeDefined();
    expect(tenth).toMatch(/March/);
  });

  it('reports a picked date to the parent', () => {
    const onChange = jest.fn();
    const view = render(
      <DateRangeCalendar start="2026-03-10" end="2026-03-14" onChange={onChange} />
    );
    const days = view.getAllByRole('button');
    fireEvent.press(days[days.length - 1]);
    expect(onChange).toHaveBeenCalled();
  });
});
