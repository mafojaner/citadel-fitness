import { render } from '@testing-library/react-native';
import { PlanPrice } from '../PlanPrice';
import { annualSavingPct, annualTotal, isPriced, type TierPricing } from '../../constants/featureCatalog';

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
    // Two decimals always, since formatPrice took over from an inlined
    // dollar sign: '$12' beside '$4.99' reads as two kinds of number.
    expect(view.getByText('$12.00')).toBeTruthy();
    expect(view.getByText('billed monthly')).toBeTruthy();
  });

  it('headlines the per-month figure when billed yearly', () => {
    // The distinction the component exists for: "$10 / month, billed yearly"
    // is comparable against "$12 / month, billed monthly". "$120 / year" is
    // not, and hiding the basis entirely is what produces a surprise on the
    // first statement.
    const view = render(<PlanPrice pricing={PAID} period="yearly" fallback="—" />);
    expect(view.getByText('$10.00')).toBeTruthy();
    expect(view.getByText('USD / month')).toBeTruthy();
    expect(view.getByText('billed yearly')).toBeTruthy();
  });

  it('also shows what the year actually costs', () => {
    // The headline stays comparable, but the total has to be findable: this
    // card showed a per-month figure and "billed yearly" and never the sum,
    // which both stores require before purchase and which is the number a
    // member is actually agreeing to.
    const view = render(<PlanPrice pricing={PAID} period="yearly" fallback="—" />);
    expect(view.getByText('$120.00 billed once a year')).toBeTruthy();
  });

  it('does not repeat the total on the monthly period', () => {
    // There the large figure already is the charge, and a second price
    // underneath reads as a different one.
    const view = render(<PlanPrice pricing={PAID} period="monthly" fallback="—" />);
    expect(view.queryByText(/billed once a year/)).toBeNull();
  });

  it('groups thousands, because annual totals run to four figures', () => {
    // R4979.88 is a number you have to count the digits of. This is the one
    // price that must not be hard to read.
    const rand: TierPricing = { monthly: 499.99, annualPerMonth: 414.99, currency: 'ZAR' };
    const view = render(<PlanPrice pricing={rand} period="yearly" fallback="—" />);
    expect(view.getByText('R4,979.88 billed once a year')).toBeTruthy();
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

  it('computes the annual total, and nothing when there is no annual price', () => {
    expect(annualTotal(PAID)).toBe(120);
    expect(annualTotal(UNSET)).toBeNull();
    // Free is a real price, so its total is zero rather than absent.
    expect(annualTotal(FREE)).toBe(0);
    // Rounded to cents: 414.99 * 12 is 4979.879999999999 in binary floating
    // point, and a price is not allowed to render with nine decimals.
    expect(annualTotal({ monthly: 499.99, annualPerMonth: 414.99, currency: 'ZAR' })).toBe(4979.88);
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
