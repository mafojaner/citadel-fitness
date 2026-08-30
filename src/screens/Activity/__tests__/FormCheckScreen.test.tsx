import { render } from '@testing-library/react-native';
import { FormCheckScreen } from '../FormCheckScreen';
import type { FormCheckQuota, FormCheckSubmission } from '../../../lib/formCheck';

/**
 * The allowance is the part of this screen that has to be right.
 *
 * Every other paid feature in the app costs server time, which scales. This
 * one costs a person's afternoon, so it is capped -- and a cap discovered
 * after filming and uploading reads as a bug rather than a plan. These
 * assert that the number is stated up front, that the button reflects it,
 * and that a review someone has already received is never presented as
 * withdrawable.
 */

const mockState: {
  submissions: FormCheckSubmission[];
  quota: FormCheckQuota | null;
  loading: boolean;
  error: string | null;
} = { submissions: [], quota: null, loading: false, error: null };

jest.mock('../../../hooks/useFormChecks', () => ({
  useFormChecks: () => ({ ...mockState, reload: jest.fn() }),
}));

jest.mock('../../../hooks/useExercises', () => ({
  useExercises: () => ({ exercises: [{ id: 'ex1', name: 'Back Squat' }], loading: false, error: null }),
}));

jest.mock('../../../state/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ session: { user: { id: 'u1', email: 'a@b.test' } } }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const quota = (remaining: number): FormCheckQuota => ({
  used: 4 - remaining,
  allowance: 4,
  remaining,
  resetsAt: '2026-09-01T00:00:00.000Z',
});

const submission = (over: Partial<FormCheckSubmission> = {}): FormCheckSubmission => ({
  id: 's1',
  exerciseId: 'ex1',
  videoPath: 'u1/1.mp4',
  note: 'bar drifts forward',
  status: 'submitted',
  createdAt: '2026-08-20T10:00:00.000Z',
  reviewedAt: null,
  reviewerNotes: null,
  ...over,
});

describe('FormCheckScreen', () => {
  beforeEach(() => {
    mockState.submissions = [];
    mockState.quota = quota(3);
    mockState.loading = false;
    mockState.error = null;
  });

  it('states the allowance before offering the upload', () => {
    const view = render(<FormCheckScreen />);
    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByText('of 4 reviews left this month')).toBeTruthy();
    expect(view.getByText(/Resets on/)).toBeTruthy();
  });

  it('disables sending and says why when the month is spent', () => {
    mockState.quota = quota(0);
    const view = render(<FormCheckScreen />);
    const button = view
      .getAllByRole('button')
      .find((b) => b.props.accessibilityLabel === 'No reviews left this month');
    expect(button).toBeTruthy();
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });

  it('names the lift on a submission that has one', () => {
    mockState.submissions = [submission()];
    const view = render(<FormCheckScreen />);
    expect(view.getByText('Back Squat')).toBeTruthy();
  });

  it('offers to withdraw only while nobody has started', () => {
    mockState.submissions = [submission({ status: 'in_review' })];
    const view = render(<FormCheckScreen />);
    // Once a coach is watching, the time has been spent; taking the slot
    // back would be taking it from the person who did the work.
    expect(view.queryByText('Withdraw')).toBeNull();
    expect(view.getByText('Being reviewed')).toBeTruthy();
  });

  it('shows the reply on a reviewed submission', () => {
    mockState.submissions = [
      submission({
        status: 'reviewed',
        reviewedAt: '2026-08-21T10:00:00.000Z',
        reviewerNotes: 'Brace before you unrack, not after.',
      }),
    ];
    const view = render(<FormCheckScreen />);
    expect(view.getByText('What the coach said')).toBeTruthy();
    expect(view.getByText('Brace before you unrack, not after.')).toBeTruthy();
    expect(view.queryByText('Withdraw')).toBeNull();
  });

  it('tells someone with nothing sent what to film', () => {
    const view = render(<FormCheckScreen />);
    expect(view.getByText(/Film a working set from the side/)).toBeTruthy();
  });
});
