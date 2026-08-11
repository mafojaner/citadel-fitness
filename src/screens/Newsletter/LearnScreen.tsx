import { useState } from 'react';
import { View } from 'react-native';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { FortressScreen } from '../Fortress/FortressScreen';
import { useContentMaxWidth } from '../../hooks/useResponsiveLayout';
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
 * features" rather than its own bottom tab. Search moved to its own
 * bottom-nav tab (covers exercises and newsletters together), so this
 * screen no longer has its own search field.
 */
export function LearnScreen() {
  const { colors, spacing } = useTheme();
  const maxWidth = useContentMaxWidth();
  const [tab, setTab] = useState<LearnTab>('newsletter');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Learn" showSearch={false} />
      <View style={{ padding: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.background, alignItems: 'center' }}>
        {/* Capped tighter than the content column — a two-option switch
            stretched across 1120px reads as a banner, not a control. */}
        <View style={{ width: '100%', maxWidth: Math.min(maxWidth, 420) }}>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === 'newsletter' ? <NewsletterScreen /> : <FortressScreen />}
      </View>
    </View>
  );
}
