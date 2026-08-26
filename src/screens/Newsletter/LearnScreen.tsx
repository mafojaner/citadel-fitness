import { View } from 'react-native';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { useTheme } from '../../theme/useTheme';
import { NewsletterScreen } from './NewsletterScreen';

/**
 * The Learn tab is the newsletter, and nothing else.
 *
 * It used to be a switcher between the newsletter and Plans, from when Plans
 * had nowhere else to live. Plans now has two proper homes, a tab on desktop
 * and a row under Account on mobile, so a segmented control here was
 * offering a third route to a page this tab has nothing to do with.
 *
 * This screen exists for the header. Home, Workouts and Activity all wrap
 * their content the same way, and dropping the switcher took the header with
 * it, which left Learn the only tab whose page began with no title. Pointing
 * the navigator straight at NewsletterScreen would reintroduce that, since
 * the header belongs to the tab rather than to the article list.
 */
export function LearnScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Learn" showSearch={false} />
      <NewsletterScreen />
    </View>
  );
}
