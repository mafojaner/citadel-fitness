import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NutritionCoachingScreen } from '../NutritionCoachingScreen';
import type { NutritionIntake } from '../../../lib/nutrition';

/**
 * The one-conversation-at-a-time rule is what these are for.
 *
 * The database enforces it with a partial unique index, so the screen
 * cannot break the rule -- but it can present it badly, and the bad
 * presentation is a form that looks available and then refuses. While a
 * plan is open the form is replaced by it rather than sitting underneath
 * disabled, because a form you cannot submit explains less than the plan
 * you are already waiting on.
 */

const mockState: {
  intakes: NutritionIntake[];
  openIntake: NutritionIntake | null;
  loading: boolean;
  error: string | null;
} = { intakes: [], openIntake: null, loading: false, error: null };

jest.mock('../../../hooks/useNutritionIntakes', () => ({
  useNutritionIntakes: () => ({ ...mockState, reload: jest.fn() }),
}));

const mockSubmit = jest.fn().mockResolvedValue('id');
jest.mock('../../../lib/nutrition', () => ({
  ...jest.requireActual('../../../lib/nutrition'),
  submitNutritionIntake: (...args: unknown[]) => mockSubmit(...args),
  withdrawNutritionIntake: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../state/profileStore', () => ({
  useProfileStore: (selector: (s: unknown) => unknown) =>
    selector({ preferences: { units: 'kg' } }),
}));

const intake = (over: Partial<NutritionIntake> = {}): NutritionIntake => ({
  id: 'n1',
  goal: 'stop gassing out on the last set',
  bodyWeightKg: 82.5,
  heightCm: null,
  activityLevel: null,
  restrictions: null,
  typicalDay: null,
  status: 'submitted',
  createdAt: '2026-08-20T10:00:00.000Z',
  answeredAt: null,
  coachPlan: null,
  ...over,
});

describe('NutritionCoachingScreen', () => {
  beforeEach(() => {
    mockState.intakes = [];
    mockState.openIntake = null;
    mockState.loading = false;
    mockState.error = null;
    mockSubmit.mockClear();
  });

  it('offers the form when nothing is open, and asks one required question', () => {
    const view = render(<NutritionCoachingScreen />);
    expect(view.getByPlaceholderText('What are you after?')).toBeTruthy();
    // The optional ones say so, so nobody thinks the feature needs their
    // height before it will do anything.
    expect(view.getByPlaceholderText('Body weight (kg, optional)')).toBeTruthy();
    expect(view.getByPlaceholderText("Anything you don't eat (optional)")).toBeTruthy();
  });

  it('will not send without a goal', () => {
    const view = render(<NutritionCoachingScreen />);
    const send = view
      .getAllByRole('button')
      .find((b) => b.props.accessibilityLabel === 'Send to a coach');
    expect(send?.props.accessibilityState?.disabled).toBe(true);
  });

  it('sends the goal and parses an optional weight', async () => {
    const view = render(<NutritionCoachingScreen />);
    fireEvent.changeText(view.getByPlaceholderText('What are you after?'), 'lean out for summer');
    fireEvent.changeText(view.getByPlaceholderText('Body weight (kg, optional)'), '82,5');
    fireEvent.press(view.getByLabelText('Send to a coach'));
    // Awaited rather than asserted straight away: submit is async and its
    // setBusy(false) lands after the test would otherwise finish, which
    // React reports as an update outside act(). Warnings in test output are
    // how a real warning gets scrolled past.
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    // Comma decimals are normalised: a European keyboard produces "82,5"
    // and Number.parseFloat would otherwise read it as 82.
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ bodyWeightKg: 82.5 }));
  });

  it('sends nothing rather than a guess when the weight is not a number', async () => {
    const view = render(<NutritionCoachingScreen />);
    fireEvent.changeText(view.getByPlaceholderText('What are you after?'), 'get stronger');
    fireEvent.changeText(view.getByPlaceholderText('Body weight (kg, optional)'), 'about 80ish');
    fireEvent.press(view.getByLabelText('Send to a coach'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    // A coach reading "about 80ish" as 80 is worse than reading nothing and
    // asking.
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ bodyWeightKg: null }));
  });

  it('replaces the form with the open plan rather than disabling it', () => {
    mockState.openIntake = intake();
    mockState.intakes = [mockState.openIntake];
    const view = render(<NutritionCoachingScreen />);
    expect(view.queryByPlaceholderText('What are you after?')).toBeNull();
    expect(view.getByText('stop gassing out on the last set')).toBeTruthy();
    expect(view.getByText('Waiting for a coach')).toBeTruthy();
  });

  it('shows the plan once a coach has written it, and offers no withdraw', () => {
    const answered = intake({
      status: 'answered',
      answeredAt: '2026-08-22T10:00:00.000Z',
      coachPlan: '2,600 kcal, 190g protein on training days.',
    });
    mockState.intakes = [answered];
    const view = render(<NutritionCoachingScreen />);
    expect(view.getByText('Your plan')).toBeTruthy();
    expect(view.getByText('2,600 kcal, 190g protein on training days.')).toBeTruthy();
    // Nothing to withdraw once the work is done.
    expect(view.queryByText('Withdraw')).toBeNull();
    // And the form is back, because no conversation is open.
    expect(view.getByPlaceholderText('What are you after?')).toBeTruthy();
  });
});
