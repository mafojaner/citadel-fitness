import { render } from '@testing-library/react-native';
import { PlanPrice } from '../PlanPrice';
import { annualSavingPct, isPriced, type TierPricing } from '../../constants/featureCatalog';

const UNSET: TierPricing = { monthly: null, annualPerMonth: null, currency: 'USD' };
const FREE: TierPricing = { monthly: 0, annualPerMonth: 0, currency: 'USD' };
const PAID: TierPricing = { monthly: 12, annualPerMonth: 10, currency: 'USD' };

describe('PlanPrice', () => {
  it('falls back when pricing is not set, which is how it ships today', () => {
    const view = render(<PlanPrice pricing={UNSET} period="monthly" fallback="Pricing at launch" />);
    expect(view.getByText('Pricing at launch')).toBeTruthy();
  });

  it('says Free rather than $0', () => {
    const view = render(<PlanPrice pricing={FREE} period="monthly" fallback="—" />);
    expect(view.getByText('Free')).toBeTruthy();
    // No billing basis on a plan with no bill.
    expect(view.queryByText(/billed/)).toBeNull();
  });

  it('shows the monthly figure and how it is billed', () => {
    const view = render(<PlanPrice pricing={PAID} period="monthly" fallback="—" />);
    expect(view.getByText('$12')).toBeTruthy();
    expect(view.getByText('billed monthly')).toBeTruthy();
  });

  it('shows the per-month figure when billed yearly, not the annual total', () => {
    // The distinction the component exists for: "$10 / month, billed yearly"
    // is comparable against "$12 / month, billed monthly". "$120 / year" is
    // not, and hiding the basis entirely is what produces a surprise on the
    // first statement.
    const view = render(<PlanPrice pricing={PAID} period="yearly" fallback="—" />);
    expect(view.getByText('$10')).toBeTruthy();
    expect(view.getByText('USD / month')).toBeTruthy();
    expect(view.getByText('billed yearly')).toBeTruthy();
  });
});

describe('pricing helpers', () => {
  it('knows when a plan has a price', () => {
    expect(isPriced(UNSET)).toBe(false);
    expect(isPriced(FREE)).toBe(true);
    expect(isPriced(PAID)).toBe(true);
  });

  it('computes the annual saving, rounded down so it cannot overstate', () => {
    // 12 -> 10 is 16.66%, which must present as 16 and never 17.
    expect(annualSavingPct(PAID)).toBe(16);
  });

  it('reports no saving where there is nothing to compare', () => {
    expect(annualSavingPct(UNSET)).toBeNull();
    expect(annualSavingPct(FREE)).toBeNull();
    expect(annualSavingPct({ monthly: 10, annualPerMonth: 10, currency: 'USD' })).toBeNull();
    // A yearly plan that costs more per month is not a saving, and the badge
    // must not render a negative one.
    expect(annualSavingPct({ monthly: 10, annualPerMonth: 12, currency: 'USD' })).toBeNull();
  });
});
