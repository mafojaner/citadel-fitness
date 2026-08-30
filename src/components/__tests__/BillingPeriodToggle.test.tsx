import { render, fireEvent } from '@testing-library/react-native';
import { BillingPeriodToggle } from '../BillingPeriodToggle';

describe('BillingPeriodToggle', () => {
  it('marks the selected period, and only that one', () => {
    const view = render(
      <BillingPeriodToggle value="monthly" onChange={() => {}} savingPct={17} />
    );
    const selected = view
      .getAllByRole('radio')
      .filter((o) => o.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('Monthly');
  });

  it('puts the saving on the yearly option', () => {
    const view = render(
      <BillingPeriodToggle value="monthly" onChange={() => {}} savingPct={17} />
    );
    expect(view.getByLabelText('Yearly, · Save 17%')).toBeTruthy();
  });

  it('says nothing about saving when there is no annual price yet', () => {
    // The state this ships in: paid pricing is unset, so a "Save 0%" or a
    // bare "·" would be the interface inventing a discount that does not
    // exist. The option still renders, without the claim.
    const view = render(<BillingPeriodToggle value="monthly" onChange={() => {}} savingPct={null} />);
    expect(view.getByLabelText('Yearly')).toBeTruthy();
    expect(view.queryByText(/Save/)).toBeNull();
  });

  it('does not claim a saving when yearly costs the same or more', () => {
    const view = render(<BillingPeriodToggle value="monthly" onChange={() => {}} savingPct={0} />);
    expect(view.queryByText(/Save/)).toBeNull();
  });

  it('reports the period that was pressed', () => {
    const onChange = jest.fn();
    const view = render(
      <BillingPeriodToggle value="monthly" onChange={onChange} savingPct={17} />
    );
    fireEvent.press(view.getByLabelText('Yearly, · Save 17%'));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });
});
