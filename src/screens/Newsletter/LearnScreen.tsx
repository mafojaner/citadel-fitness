import { useState } from 'react';
import { View } from 'react-native';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { FortressScreen } from '../Fortress/FortressScreen';
import { useTheme } from '../../theme/useTheme';
import { NewsletterScreen } from './NewsletterScreen';

type LearnTab = 'newsletter' | 'fortress';

const TABS: { label: string; value: LearnTab }[] = [
  { label: 'Newsletter', value: 'newsletter' },
  { label: 'Fortress', value: 'fortress' },
];

/**
 * The Learn tab's landing screen: a switcher between the free newsletter
 * and Fortress, which now lives here as "the newsletter for premium
 * features" rather than its own bottom tab.
 */
export function LearnScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState<LearnTab>('newsletter');
  const [query, setQuery] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Learn" placeholder="Search newsletters..." value={query} onChangeText={setQuery} />
      <View style={{ padding: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.background }}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'newsletter' ? <NewsletterScreen query={query} /> : <FortressScreen />}
      </View>
    </View>
  );
}
