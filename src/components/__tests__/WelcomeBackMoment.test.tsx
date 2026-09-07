import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeBackMoment } from '../WelcomeBackMoment';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';

/**
 * The greeting is gated on a one-shot store flag, and that gate is the
 * whole risk here. It has to draw on a real sign-in, has to consume the
 * flag so the next screen mount does not replay it, and must not appear at
 * all on a restored session -- which is every cold start, and so the case
 * that would be most annoying to get wrong.
 */

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const PAST_EVERYTHING_MS = 12000;

function renderMoment(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

function signedInJustNow(name: string | null) {
  useAuthStore.setState({ justSignedIn: true } as never);
  useProfileStore.setState({ name, avatarUrl: null } as never);
}

describe('WelcomeBackMoment', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('greets by first name and consumes the flag', () => {
    signedInJustNow('Tumi Devs');
    renderMoment(<WelcomeBackMoment streakDays={3} />);

    expect(screen.getByText('Welcome back, Tumi')).toBeTruthy();
    expect(screen.getByText('3 day streak. Keep it going.')).toBeTruthy();
    // Consumed on mount, so a re-mount on the next screen does not replay it.
    expect(useAuthStore.getState().justSignedIn).toBe(false);
  });

  it('draws nothing on a restored session', () => {
    useAuthStore.setState({ justSignedIn: false } as never);
    useProfileStore.setState({ name: 'Tumi Devs', avatarUrl: null } as never);

    renderMoment(<WelcomeBackMoment streakDays={3} />);

    expect(screen.queryByText('Welcome back, Tumi')).toBeNull();
    expect(screen.queryByLabelText('Skip')).toBeNull();
  });

  it('falls back to an unnamed greeting before the profile has a name', () => {
    signedInJustNow(null);
    renderMoment(<WelcomeBackMoment streakDays={0} />);

    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('says something else when there is no streak to report', () => {
    signedInJustNow('Tumi Devs');
    renderMoment(<WelcomeBackMoment streakDays={0} />);

    expect(screen.getByText("Good to see you. Let's log today's session.")).toBeTruthy();
    expect(screen.queryByText('0 day streak. Keep it going.')).toBeNull();
  });

  it('leaves on its own', () => {
    signedInJustNow('Tumi Devs');
    renderMoment(<WelcomeBackMoment streakDays={1} />);

    expect(screen.getByText('Welcome back, Tumi')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(PAST_EVERYTHING_MS);
    });

    expect(screen.queryByText('Welcome back, Tumi')).toBeNull();
  });

  it('leaves early when skip is pressed', () => {
    signedInJustNow('Tumi Devs');
    renderMoment(<WelcomeBackMoment streakDays={1} />);

    fireEvent.press(screen.getByLabelText('Skip'));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.queryByText('Welcome back, Tumi')).toBeNull();
  });

  it('does not come back after skip when the hold would have expired', () => {
    // Both the skip and the timer end it, and this unmounts itself on the
    // way out rather than navigating. If the guard let both through, the
    // second exit would run against a component that has already gone.
    signedInJustNow('Tumi Devs');
    renderMoment(<WelcomeBackMoment streakDays={1} />);

    fireEvent.press(screen.getByLabelText('Skip'));
    act(() => {
      jest.advanceTimersByTime(PAST_EVERYTHING_MS);
    });

    expect(screen.queryByText('Welcome back, Tumi')).toBeNull();
  });
});
