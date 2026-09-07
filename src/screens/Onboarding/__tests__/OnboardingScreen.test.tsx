import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingScreen } from '../OnboardingScreen';
import { useAuthStore } from '../../../state/authStore';
import { useProfileStore } from '../../../state/profileStore';

/**
 * The intro is the one screen a member sees exactly once, and the only way
 * off it is `hasSeenOnboarding`. So the things worth holding are the two
 * that would strand someone on it or skip it for the wrong reason: both
 * exits have to write the preference, and a failed write has to leave them
 * here with a way to try again rather than silently swallowing it.
 */

const USER_ID = 'user-1';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderIntro(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

function setUp(savePreferences: jest.Mock) {
  useAuthStore.setState({ session: { user: { id: USER_ID } } } as never);
  useProfileStore.setState({ savePreferences } as never);
}

describe('OnboardingScreen', () => {
  it('starts on the first slide and does not offer the finish action yet', () => {
    setUp(jest.fn());
    renderIntro(<OnboardingScreen />);

    expect(screen.getByText('Welcome to Citadel Fitness')).toBeTruthy();
    expect(screen.getByLabelText('Next')).toBeTruthy();
    expect(screen.queryByLabelText("Let's go")).toBeNull();
  });

  it('walks forward through every slide and finishes on the last', async () => {
    const savePreferences = jest.fn().mockResolvedValue(undefined);
    setUp(savePreferences);
    renderIntro(<OnboardingScreen />);

    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('A complete exercise catalogue')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('See your progress')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('Fortress and Valhalla are coming')).toBeTruthy();

    // Last slide: the button changes job rather than advancing off the end.
    fireEvent.press(screen.getByLabelText("Let's go"));
    await waitFor(() =>
      expect(savePreferences).toHaveBeenCalledWith(USER_ID, { hasSeenOnboarding: true })
    );
  });

  it('skipping writes the same preference as finishing', async () => {
    // Skip is not a way to see the intro again next launch. If it ever
    // stopped writing, the app would show this screen on every cold start
    // to anyone who used it.
    const savePreferences = jest.fn().mockResolvedValue(undefined);
    setUp(savePreferences);
    renderIntro(<OnboardingScreen />);

    fireEvent.press(screen.getByLabelText('Skip onboarding'));
    await waitFor(() =>
      expect(savePreferences).toHaveBeenCalledWith(USER_ID, { hasSeenOnboarding: true })
    );
  });

  it('surfaces a failed write and leaves the action usable', async () => {
    const savePreferences = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce(undefined);
    setUp(savePreferences);
    renderIntro(<OnboardingScreen />);

    fireEvent.press(screen.getByLabelText('Skip onboarding'));
    await waitFor(() => expect(screen.getByText('Network request failed')).toBeTruthy());

    // Still here, and still able to leave.
    expect(screen.getByText('Welcome to Citadel Fitness')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Skip onboarding'));
    await waitFor(() => expect(savePreferences).toHaveBeenCalledTimes(2));
  });

  it('does not try to save without a signed-in user', () => {
    const savePreferences = jest.fn();
    useAuthStore.setState({ session: null } as never);
    useProfileStore.setState({ savePreferences } as never);
    renderIntro(<OnboardingScreen />);

    fireEvent.press(screen.getByLabelText('Skip onboarding'));

    expect(savePreferences).not.toHaveBeenCalled();
  });
});
