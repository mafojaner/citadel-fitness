import { fireEvent, render, screen } from '@testing-library/react-native';
import { FortressTodayCard } from '../FortressTodayCard';
import { useFortressToday, type FortressToday } from '../../hooks/useFortressToday';
import { useMembershipTier } from '../../hooks/useMembership';
import { useOpenPlans } from '../../hooks/useOpenPlans';

/**
 * This card absorbed the Structured programs card that used to sit four
 * rows below it on Workouts. Both were built from the same header and row
 * and both opened the same screen, which is why two of them read as the app
 * saying one thing twice.
 *
 * So the thing to hold is that they are now one row with two states, and
 * that exactly one of them is ever drawn. The states are otherwise hard to
 * see: reaching the offer state on a real account means leaving a
 * programme, and reaching the locked one means not paying for the tier.
 */

jest.mock('../../hooks/useFortressToday');
jest.mock('../../hooks/useMembership');
jest.mock('../../hooks/useOpenPlans');

const mockToday = useFortressToday as jest.MockedFunction<typeof useFortressToday>;
const mockTier = useMembershipTier as jest.MockedFunction<typeof useMembershipTier>;
const mockOpenPlans = useOpenPlans as jest.MockedFunction<typeof useOpenPlans>;

const NOTHING: FortressToday = { program: null, goal: null, newRecords: 0, group: null };

const ROUTES = {
  onOpenPrograms: jest.fn(),
  onOpenGoals: jest.fn(),
  onOpenRecords: jest.fn(),
  onOpenGroups: jest.fn(),
};

function setUp(today: FortressToday | null, tier: 'free' | 'fortress' | 'valhalla' = 'fortress') {
  const openPlans = jest.fn();
  mockToday.mockReturnValue({ data: today } as ReturnType<typeof useFortressToday>);
  mockTier.mockReturnValue(tier);
  mockOpenPlans.mockReturnValue(openPlans);
  return openPlans;
}

describe('FortressTodayCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names the next session when a programme is running', () => {
    setUp({
      ...NOTHING,
      program: { programName: 'Push / Pull / Legs', dayName: 'Legs', position: 3, cycleLength: 3 },
    });
    render(<FortressTodayCard {...ROUTES} />);

    expect(screen.getByText('Legs')).toBeTruthy();
    expect(screen.getByText('Day 3 of 3 · Push / Pull / Legs')).toBeTruthy();
    // The offer is the row's other state, so it must not also be present.
    expect(screen.queryByText('Structured programs')).toBeNull();
  });

  it('offers the feature when no programme is running', () => {
    setUp(NOTHING);
    render(<FortressTodayCard {...ROUTES} />);

    expect(screen.getByText('Structured programs')).toBeTruthy();
    expect(screen.queryByText(/Day \d of \d/)).toBeNull();
  });

  it('sends an entitled member with no programme to programs, not to plans', () => {
    const openPlans = setUp(NOTHING);
    render(<FortressTodayCard {...ROUTES} />);

    fireEvent.press(screen.getByText('Structured programs'));

    expect(ROUTES.onOpenPrograms).toHaveBeenCalledTimes(1);
    expect(openPlans).not.toHaveBeenCalled();
  });

  it('still shows the offer to a free account, and sends it to plans', () => {
    // The card returned null below Fortress while a separate Structured
    // programs card carried the upsell. Absorbing that card means absorbing
    // its job; drawing nothing here would silently drop the offer.
    const openPlans = setUp(null, 'free');
    render(<FortressTodayCard {...ROUTES} />);

    expect(screen.getByText('Structured programs')).toBeTruthy();
    fireEvent.press(screen.getByText('Structured programs'));

    expect(openPlans).toHaveBeenCalledTimes(1);
    expect(ROUTES.onOpenPrograms).not.toHaveBeenCalled();
  });

  it('heads itself TODAY only when it has something about today', () => {
    setUp({ ...NOTHING, newRecords: 1 });
    const withNews = render(<FortressTodayCard {...ROUTES} />);
    expect(screen.getByText('FORTRESS TODAY')).toBeTruthy();
    withNews.unmount();

    // An offer is not a bulletin, so it does not get to say "today".
    setUp(NOTHING);
    render(<FortressTodayCard {...ROUTES} />);
    expect(screen.getByText('FORTRESS')).toBeTruthy();
    expect(screen.queryByText('FORTRESS TODAY')).toBeNull();
  });

  it('keeps the other lines it carried before the merge', () => {
    // Records, goals and standings are the reason this card is not just the
    // offer. They went missing when it was removed outright, which is what
    // the merge exists to undo.
    setUp({
      program: { programName: 'PPL', dayName: 'Legs', position: 1, cycleLength: 3 },
      goal: null,
      newRecords: 2,
      group: { groupName: 'Iron Club', rank: 3, memberCount: 8 },
    });
    render(<FortressTodayCard {...ROUTES} />);

    expect(screen.getByText('2 new personal records')).toBeTruthy();
    expect(screen.getByText('3rd of 8')).toBeTruthy();
  });

  it('suppresses a group of one rather than congratulating a member on it', () => {
    setUp({
      ...NOTHING,
      group: { groupName: 'Solo', rank: 1, memberCount: 1 },
    });
    render(<FortressTodayCard {...ROUTES} />);

    expect(screen.queryByText('1st of 1')).toBeNull();
  });
});
