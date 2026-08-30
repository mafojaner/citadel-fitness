import { render, fireEvent } from '@testing-library/react-native';
import { HelpScreen } from '../HelpScreen';

/**
 * The priority-support promise is tier-conditional copy, which is exactly
 * the kind of thing that is right when written and wrong six weeks later
 * when the tier moves. Shown to the wrong account it is a claim the product
 * does not honour, which is worse than not mentioning it at all.
 */

const mockHasTier = jest.fn(() => false);

jest.mock('../../../hooks/useMembership', () => ({
  ...jest.requireActual('../../../hooks/useMembership'),
  useHasTier: () => mockHasTier(),
}));

jest.mock('../../../lib/feedback', () => ({
  submitFeedback: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../state/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ session: { user: { id: 'u1', email: 'someone@example.com' } } }),
}));

describe('HelpScreen priority support', () => {
  beforeEach(() => mockHasTier.mockReturnValue(false));

  it('says nothing about priority to an account without it', () => {
    const view = render(<HelpScreen />);
    expect(view.queryByText(/priority support/i)).toBeNull();
    expect(view.queryByText(/front of the queue/i)).toBeNull();
  });

  it('tells an entitled member before they write, not only after', () => {
    // The moment the tier is worth anything to them is while deciding
    // whether to bother writing at all.
    mockHasTier.mockReturnValue(true);
    const view = render(<HelpScreen />);
    expect(
      view.getByText('Your plan includes priority support, so this is answered ahead of other messages.')
    ).toBeTruthy();
  });

  it('still lets anyone send feedback', () => {
    // Priority changes the order it is answered in, never whether it can be
    // sent. A gate here would be charging for the ability to report a bug.
    const view = render(<HelpScreen />);
    fireEvent.changeText(view.getByPlaceholderText("What's on your mind?"), 'the app crashed');
    // By role: "Send feedback" is both the card's title and the button's
    // label, so matching on text alone finds two nodes and asserts nothing
    // about the control.
    const send = view
      .getAllByRole('button')
      .filter((b) => b.props.accessibilityLabel === 'Send feedback');
    expect(send).toHaveLength(1);
    expect(send[0].props.accessibilityState?.disabled).toBeFalsy();
  });
});
