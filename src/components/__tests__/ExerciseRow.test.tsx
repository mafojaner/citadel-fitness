import { render, fireEvent } from '@testing-library/react-native';
import { useCallback, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { ExerciseRow } from '../ExerciseRow';
import type { Exercise } from '../../types/models';

/**
 * Counted through the badge because it is the child ExerciseRow renders that
 * actually costs something (a LinearGradient), and it runs only when
 * ExerciseRow's own body runs.
 *
 * The `mock` prefix is not decoration: babel-plugin-jest-hoist lifts
 * jest.mock above the imports, so the factory would otherwise close over a
 * variable that does not exist yet. Names beginning with `mock` are the
 * documented exception it allows through.
 */
const mockBadgeRenders: string[] = [];

jest.mock('../GradientIconBadge', () => ({
  GradientIconBadge: (props: { icon: string }) => {
    mockBadgeRenders.push(props.icon);
    return null;
  },
}));

/**
 * Turns the 14 August performance item from a claim into a measurement.
 *
 * That row on the launch gate has read "still unverified -- only a
 * profiling session will settle it" ever since, and half of what it
 * described had not been done at all: the catalogue's data was memoised,
 * its rows were not. They were inline JSX inside FlatList's renderItem, so
 * every keystroke in the search field rebuilt every visible row, each one
 * drawing a LinearGradient.
 *
 * A profiler is still the only thing that can say how many milliseconds
 * that costs on a real phone. But "did this row re-render at all" is a
 * countable fact, and it is the fact the fix is about -- so it is counted
 * here rather than left to a session nobody has run in two weeks.
 */

const EXERCISES: Exercise[] = [
  { id: 'a', name: 'Back Squat', category: 'legs', type: 'strength', description: null, tracksDistance: false },
  { id: 'b', name: 'Bench Press', category: 'chest', type: 'strength', description: null, tracksDistance: false },
  { id: 'c', name: 'Deadlift', category: 'back', type: 'strength', description: null, tracksDistance: false },
] as Exercise[];

/**
 * A stand-in for the catalogue screen, with the same shape: a search field
 * whose state lives above a list of memoised rows. Testing the real screen
 * would drag in navigation, the draft store and the exercise fetch, none of
 * which have anything to do with what is being measured.
 */
function Harness() {
  const [query, setQuery] = useState('');

  const onSelect = useCallback(() => {}, []);
  const onShowInfo = useCallback(() => {}, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow exercise={item} onSelect={onSelect} onShowInfo={onShowInfo} />
    ),
    [onSelect, onShowInfo]
  );

  return (
    <View>
      <TextInput testID="search" value={query} onChangeText={setQuery} />
      <Text testID="query">{query}</Text>
      <FlatList data={EXERCISES} keyExtractor={(e) => e.id} renderItem={renderItem} />
    </View>
  );
}

describe('ExerciseRow', () => {
  beforeEach(() => mockBadgeRenders.length = 0);

  it('renders the exercise and its category', () => {
    const view = render(
      <ExerciseRow exercise={EXERCISES[0]} onSelect={() => {}} onShowInfo={() => {}} />
    );
    expect(view.getByText('Back Squat')).toBeTruthy();
    expect(view.getByText('legs')).toBeTruthy();
  });

  it('passes the exercise back rather than a pre-bound closure', () => {
    // The prop shape memo depends on: if the parent passed
    // `() => onSelect(exercise)` instead, every render would produce a new
    // function and the memo would silently do nothing.
    const onSelect = jest.fn();
    const view = render(
      <ExerciseRow exercise={EXERCISES[1]} onSelect={onSelect} onShowInfo={() => {}} />
    );
    fireEvent.press(view.getByLabelText('Bench Press'));
    expect(onSelect).toHaveBeenCalledWith(EXERCISES[1]);
  });

  it('offers the info control separately from the row itself', () => {
    const onShowInfo = jest.fn();
    const onSelect = jest.fn();
    const view = render(
      <ExerciseRow exercise={EXERCISES[2]} onSelect={onSelect} onShowInfo={onShowInfo} />
    );
    fireEvent.press(view.getByLabelText('About Deadlift'));
    expect(onShowInfo).toHaveBeenCalledWith(EXERCISES[2]);
    // The row's own press must not have fired too: tapping "about" should
    // not also add the exercise to the workout.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not re-render its rows when unrelated parent state changes', () => {
    // The measurement, counted through GradientIconBadge because that is
    // the expensive child and it only runs when ExerciseRow's body does.
    // Counting renderItem calls instead would prove nothing: FlatList calls
    // that on every parent pass whether or not the memo holds.
    const view = render(<Harness />);

    const afterMount = mockBadgeRenders.length;
    expect(afterMount).toBe(EXERCISES.length);

    fireEvent.changeText(view.getByTestId('search'), 'b');
    fireEvent.changeText(view.getByTestId('search'), 'be');
    fireEvent.changeText(view.getByTestId('search'), 'ben');

    // The parent really did re-render three times.
    expect(view.getByTestId('query').props.children).toBe('ben');
    // And not one row was rebuilt. Before this change that number was
    // afterMount * 4 -- every visible row, on every keystroke.
    expect(mockBadgeRenders.length).toBe(afterMount);
  });

  it('does re-render a row whose exercise actually changed', () => {
    // The other half: a memo that never re-renders is a bug, not a
    // optimisation. Same callbacks, different exercise.
    const view = render(
      <ExerciseRow exercise={EXERCISES[0]} onSelect={() => {}} onShowInfo={() => {}} />
    );
    const first = mockBadgeRenders.length;
    view.rerender(
      <ExerciseRow exercise={EXERCISES[1]} onSelect={() => {}} onShowInfo={() => {}} />
    );
    expect(mockBadgeRenders.length).toBeGreaterThan(first);
    expect(view.getByText('Bench Press')).toBeTruthy();
  });
});
