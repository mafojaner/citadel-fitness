import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { CurrencyPicker } from '../CurrencyPicker';
import { CURRENCIES } from '../../lib/currency';

/**
 * Pills only. The disclaimer that used to live here moved behind the plans
 * page's info toggle on 1 September, because the top of that page had grown
 * to six lines of prose before the first plan.
 *
 * It is still pinned, just in PlansScreen's tests rather than these --
 * moving an explanation behind a disclosure is fine, and losing it is not,
 * so the assertion had to move with it rather than be deleted alongside.
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

  it('renders whatever it is handed in the trailing slot', () => {
    // Where the info button goes, so the explanation shares a row with the
    // pills rather than taking a line of its own.
    const view = render(
      <CurrencyPicker value="USD" onChange={() => {}} trailing={<Text>slot</Text>} />
    );
    expect(view.getByText('slot')).toBeTruthy();
  });

  it('carries no prose of its own any more', () => {
    const view = render(<CurrencyPicker value="ZAR" onChange={() => {}} />);
    expect(view.queryByText(/store account/)).toBeNull();
  });
});
