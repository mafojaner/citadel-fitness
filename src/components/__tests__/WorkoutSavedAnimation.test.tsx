import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WorkoutSavedAnimation } from '../WorkoutSavedAnimation';

/**
 * What this file is actually guarding.
 *
 * The celebration calls `onDone`, and on the caller's side `onDone` is
 * `reset()` plus `navigation.popToTop()`. So the contract is not "it
 * eventually finishes" but "it finishes exactly once": there are two things
 * that can end it -- the hold timer and the skip control -- and if both fire
 * you get two pops off the navigation stack from one saved workout.
 *
 * Timings live in the module, so the waits below are deliberately generous
 * multiples rather than the exact constants; a test that restates the
 * constants passes when someone changes both and proves nothing.
 */

const BEFORE_ANY_EXIT_MS = 300;
const PAST_EVERYTHING_MS = 12000;

/**
 * The skip control is placed against `insets.top`, so the component reads
 * the safe area and there has to be a provider above it. Fixed metrics
 * rather than the real ones: nothing here asserts a position, and a test
 * whose setup varies by device is a test that fails on someone else's
 * machine for a reason that has nothing to do with it.
 */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderCelebration(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

describe('WorkoutSavedAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the headline and a skip control', () => {
    renderCelebration(<WorkoutSavedAnimation onDone={jest.fn()} />);

    expect(screen.getByText('Nice work.')).toBeTruthy();
    expect(screen.getByLabelText('Skip')).toBeTruthy();
  });

  it('leaves on its own once the hold is up', () => {
    const onDone = jest.fn();
    renderCelebration(<WorkoutSavedAnimation onDone={onDone} />);

    act(() => {
      jest.advanceTimersByTime(BEFORE_ANY_EXIT_MS);
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(PAST_EVERYTHING_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('leaves early when skip is pressed', () => {
    const onDone = jest.fn();
    renderCelebration(<WorkoutSavedAnimation onDone={onDone} />);

    fireEvent.press(screen.getByLabelText('Skip'));
    act(() => {
      jest.advanceTimersByTime(BEFORE_ANY_EXIT_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not leave twice when skip races the hold timer', () => {
    // The case the guard exists for: skip pressed, then the hold expires
    // while the exit fade is still running. Without the once-only guard
    // that is two exit animations and two onDone calls, which the caller
    // turns into two navigation.popToTop() calls.
    const onDone = jest.fn();
    renderCelebration(<WorkoutSavedAnimation onDone={onDone} />);

    fireEvent.press(screen.getByLabelText('Skip'));
    act(() => {
      jest.advanceTimersByTime(PAST_EVERYTHING_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not leave twice when skip is pressed repeatedly', () => {
    const onDone = jest.fn();
    renderCelebration(<WorkoutSavedAnimation onDone={onDone} />);

    const skip = screen.getByLabelText('Skip');
    fireEvent.press(skip);
    fireEvent.press(skip);
    fireEvent.press(skip);
    act(() => {
      jest.advanceTimersByTime(PAST_EVERYTHING_MS);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('holds longer when there is a record to read', () => {
    // Not asserting the exact numbers, only the ordering the constants are
    // there to express: a record has to survive past the point where a
    // plain save would already have left.
    const plain = jest.fn();
    const withRecord = jest.fn();

    const { unmount } = renderCelebration(<WorkoutSavedAnimation onDone={plain} />);
    act(() => {
      jest.advanceTimersByTime(2600);
    });
    unmount();

    renderCelebration(
      <WorkoutSavedAnimation
        onDone={withRecord}
        records={[{ exerciseName: 'Bench Press', weight: 70, reps: 5 }]}
      />
    );
    act(() => {
      jest.advanceTimersByTime(2600);
    });

    expect(plain).toHaveBeenCalledTimes(1);
    expect(withRecord).not.toHaveBeenCalled();
  });

  it('names the record it is celebrating', () => {
    renderCelebration(
      <WorkoutSavedAnimation
        onDone={jest.fn()}
        records={[{ exerciseName: 'Bench Press', weight: 70, reps: 5 }]}
        weightUnit="kg"
      />
    );

    expect(screen.getByText('NEW PERSONAL RECORD')).toBeTruthy();
    expect(screen.getByText('Bench Press · 70 kg × 5')).toBeTruthy();
  });

  it('caps the listed records and says how many are left', () => {
    const records = ['A', 'B', 'C', 'D', 'E'].map((exerciseName) => ({
      exerciseName,
      weight: 60,
      reps: 5,
    }));
    renderCelebration(<WorkoutSavedAnimation onDone={jest.fn()} records={records} />);

    expect(screen.getByText('5 NEW PERSONAL RECORDS')).toBeTruthy();
    expect(screen.getByText('and 2 more')).toBeTruthy();
    expect(screen.queryByText('D · 60 kg × 5')).toBeNull();
  });
});
