import { render, fireEvent } from '@testing-library/react-native';
import { PlansScreen } from '../PlansScreen';

/**
 * The pricing *flow*, not just the pricing page.
 *
 * The page used to open on three cards side by side and everything below
 * them. That is a comparison, and a comparison is work you have to do before
 * you can decide anything. It now opens on one card -- the next plan up from
 * the one you hold -- with the full list one tap away.
 *
 * These assert the process rather than the pixels: what you see first, what
 * the escape hatch is, that asking for everything gives you everything, and
 * that the plan being recommended is never one you already pay for.
 */

const mockTier = jest.fn(() => 'free');
const mockIsDesktop = jest.fn(() => false);

jest.mock('../../../hooks/useMembership', () => ({
  useMembershipTier: () => mockTier(),
  useHasTier: () => false,
  useIsFortress: () => false,
}));

// Spread the real module rather than replacing it. ScreenContainer also
// reads useContentMaxWidth from here, and a wholesale mock silently removes
// it -- which surfaces as every test in the file failing inside a component
// that has nothing to do with what is being tested.
jest.mock('../../../hooks/useResponsiveLayout', () => ({
  ...jest.requireActual('../../../hooks/useResponsiveLayout'),
  useIsDesktop: () => mockIsDesktop(),
}));

jest.mock('../../../hooks/useOpenPlans', () => ({
  useOpenPlans: () => jest.fn(),
}));

jest.mock('../../../hooks/useFortressWaitlist', () => ({
  useFortressWaitlist: () => ({
    accountEmail: 'someone@example.com',
    joined: false,
    joinedEmail: null,
    joinedTier: null,
    loading: false,
    joining: false,
    leaving: false,
    error: null,
    join: jest.fn(),
    leave: jest.fn(),
  }),
}));

jest.mock('../../../components/HeaderSearchBar', () => ({
  HeaderSearchBar: () => null,
}));

describe('PlansScreen flow', () => {
  beforeEach(() => {
    mockTier.mockReturnValue('free');
    mockIsDesktop.mockReturnValue(false);
  });

  it('opens on one recommended plan, not on all three', () => {
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('Recommended for you')).toBeTruthy();
    expect(view.getByText('Fortress')).toBeTruthy();
    // Valhalla's card is not on screen yet. Its name still appears in prose
    // on the subtitle line, so this looks for the comparison table's own
    // heading instead, which only exists in the expanded view.
    expect(view.queryByText('Compare plans')).toBeNull();
  });

  it('offers a way to stay on free without hunting for it', () => {
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('Keep using Citadel Fitness for free')).toBeTruthy();
  });

  it('shows every plan once asked, and does not collapse again', () => {
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByText('View all plans'));

    expect(view.getByText('Compare plans')).toBeTruthy();
    expect(view.queryByText('View all plans')).toBeNull();
  });

  it('recommends the next plan up, never one already held', () => {
    // The mistake planAction exists to stop, in its other form: a Fortress
    // member being sold Fortress.
    mockTier.mockReturnValue('fortress');
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('Recommended for you')).toBeTruthy();
    expect(view.getByText('Valhalla')).toBeTruthy();
  });

  it('recommends nothing to the top tier, and shows the full list instead', () => {
    mockTier.mockReturnValue('valhalla');
    const view = render(<PlansScreen variant="screen" />);
    expect(view.queryByText('Recommended for you')).toBeNull();
    // Straight to the comparison, because there is nothing above them to
    // recommend and a condensed view would have nothing to condense to.
    expect(view.getByText('Compare plans')).toBeTruthy();
  });

  it('keeps the row on desktop, where three cards fit', () => {
    mockIsDesktop.mockReturnValue(true);
    const view = render(<PlansScreen variant="screen" />);
    expect(view.queryByText('View all plans')).toBeNull();
    expect(view.getByText('Compare plans')).toBeTruthy();
  });

  it('does not print a price it does not have', () => {
    // Paid pricing is deliberately unset. Until it is filled in the card must
    // say so rather than showing a placeholder number, which is the one kind
    // of placeholder that gets screenshotted.
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('Pricing at launch')).toBeTruthy();
    expect(view.queryByText('No commitment · Cancel anytime')).toBeNull();
  });
});
