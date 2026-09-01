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

const mockSavePreferences = jest.fn();
let mockCurrency: string | undefined = 'USD';

jest.mock('../../../state/profileStore', () => ({
  useProfileStore: (selector: (s: unknown) => unknown) =>
    selector({
      preferences: { currency: mockCurrency },
      savePreferences: mockSavePreferences,
    }),
}));

jest.mock('../../../state/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ session: { user: { id: 'u1' } } }),
}));

describe('PlansScreen flow', () => {
  beforeEach(() => {
    mockTier.mockReturnValue('free');
    mockIsDesktop.mockReturnValue(false);
    mockCurrency = 'USD';
    mockSavePreferences.mockClear();
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

  it('shows the price now that there is one', () => {
    // Until 28 August this asserted the opposite: that no number appeared,
    // because none was set. Prices landed in preparation for launch, so the
    // test follows the product rather than pinning it in the past.
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('$4.99')).toBeTruthy();
    expect(view.getByText('USD / month')).toBeTruthy();
    expect(view.getByText('billed monthly')).toBeTruthy();
  });

  it('switches the figure when the billing period changes', () => {
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('Yearly, · Save 20%'));
    expect(view.getByText('$3.99')).toBeTruthy();
    expect(view.getByText('billed yearly')).toBeTruthy();
  });

  it('still sells nothing, whatever the price says', () => {
    // The thing a price makes easy to get wrong. Billing does not exist:
    // there is no purchase flow, no RevenueCat SDK and no store product, so
    // every plan action must still be a waitlist. A button reading "Get
    // Fortress" beside a real number would be taking an order the app cannot
    // fill.
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByLabelText('Join the waitlist')).toBeTruthy();
    expect(view.queryByText(/^Get /)).toBeNull();
    expect(view.getByText(/Nothing is on sale yet/)).toBeTruthy();
  });

  it('shows the price in the stored currency, not always dollars', () => {
    mockCurrency = 'ZAR';
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('R89.99')).toBeTruthy();
    expect(view.getByText('ZAR / month')).toBeTruthy();
    // And nothing anywhere still says dollars.
    expect(view.queryByText('$4.99')).toBeNull();
  });

  it('persists the currency rather than only changing the view', () => {
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('South African rand (ZAR)'));
    // A patch, not the whole preferences object: sending the lot would write
    // back whatever this screen was holding and could revert a setting
    // changed elsewhere.
    expect(mockSavePreferences).toHaveBeenCalledWith('u1', { currency: 'ZAR' });
  });

  it('falls back to dollars on a currency it does not recognise', () => {
    // A stored preference can outlive the currency it names. Showing dollars
    // beats a pricing page that throws.
    mockCurrency = 'XBT';
    const view = render(<PlansScreen variant="screen" />);
    expect(view.getByText('$4.99')).toBeTruthy();
  });

  it('keeps the price and the period toggle agreeing in any currency', () => {
    mockCurrency = 'ZAR';
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('Yearly, · Save 20%'));
    expect(view.getByText('R71.99')).toBeTruthy();
    expect(view.getByText('billed yearly')).toBeTruthy();
  });

  it('starts with the explanation hidden, and the plans visible', () => {
    // The complaint this answers: six lines of prose above the first plan.
    const view = render(<PlansScreen variant="screen" />);
    expect(view.queryByText(/Fortress tells you what you did/)).toBeNull();
    expect(view.queryByText(/store account/)).toBeNull();
    // The currency pills stay, because they are a control rather than an
    // explanation.
    expect(view.getByLabelText('US dollar (USD)')).toBeTruthy();
    expect(view.getByText('Fortress')).toBeTruthy();
  });

  it('shows both explanations behind the one info button', () => {
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('About plans and pricing'));
    expect(view.getByText(/Fortress tells you what you did/)).toBeTruthy();
    expect(view.getByText(/currency of your own store account/)).toBeTruthy();
  });

  it('hides it again, and says so on the control', () => {
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('About plans and pricing'));
    // The label flips, so the control describes its own state rather than
    // leaving a screen reader to notice text appearing further down.
    fireEvent.press(view.getByLabelText('Hide information about plans and pricing'));
    expect(view.queryByText(/Fortress tells you what you did/)).toBeNull();
  });

  it('keeps the store-charges note truthful for the chosen currency', () => {
    // Moved behind a disclosure, not deleted. Someone with a US account can
    // read rand here and still be billed dollars, and this is the only place
    // the app says so.
    mockCurrency = 'ZAR';
    const view = render(<PlansScreen variant="screen" />);
    fireEvent.press(view.getByLabelText('About plans and pricing'));
    expect(view.getByText(/Prices are shown in South African rand/)).toBeTruthy();
  });
});
