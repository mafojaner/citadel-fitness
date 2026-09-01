import { render, fireEvent } from '@testing-library/react-native';
import { CurrencyPicker } from '../CurrencyPicker';
import { CURRENCIES } from '../../lib/currency';

/**
 * The disclaimer is the reason most of these exist.
 *
 * Nothing here converts anything -- each currency carries its own price
 * points, the way a store console works. But someone with a US store account
 * can still switch this to rand, read R89.99, and be charged $4.99, because
 * the stores bill in the currency of the buyer's account and not in whatever
 * the app was showing. Saying that once, plainly, on the screen is the whole
 * defence against a support thread about a card statement, so it is pinned
 * rather than left as a line someone tidies away.
 */
describe('CurrencyPicker', () => {
  it('offers every currency the price table has', () => {
    const view = render(<CurrencyPicker value="USD" onChange={() => {}} />);
    for (const c of CURRENCIES) {
      expect(view.getByLabelText(`${c.label} (${c.code})`)).toBeTruthy();
    }
  });

  it('marks exactly one as selected, and it is the current value', () => {
    const view = render(<CurrencyPicker value="ZAR" onChange={() => {}} />);
    const selected = view
      .getAllByRole('radio')
      .filter((p) => p.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('South African rand (ZAR)');
  });

  it('reports the currency that was pressed', () => {
    const onChange = jest.fn();
    const view = render(<CurrencyPicker value="USD" onChange={onChange} />);
    fireEvent.press(view.getByLabelText('British pound (GBP)'));
    expect(onChange).toHaveBeenCalledWith('GBP');
  });

  it('says the store charges in the account currency, not this one', () => {
    const view = render(<CurrencyPicker value="ZAR" onChange={() => {}} />);
    expect(view.getByText(/South African rand/)).toBeTruthy();
    expect(view.getByText(/currency of your own store account/)).toBeTruthy();
  });

  it('names the selected currency in full, not just its code', () => {
    // "Prices shown in ZAR" assumes the reader knows the code. The full name
    // costs nothing and is the difference between a label and a hint.
    const view = render(<CurrencyPicker value="EUR" onChange={() => {}} />);
    expect(view.getByText(/Prices shown in Euro/)).toBeTruthy();
  });
});
