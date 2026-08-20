import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { View } from 'react-native';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { PlansScreen } from '../Plans/PlansScreen';
import { useContentMaxWidth } from '../../hooks/useResponsiveLayout';
import { useTheme } from '../../theme/useTheme';
import type { NewsletterStackParamList } from '../../navigation/stacks/NewsletterStack';
import { NewsletterScreen } from './NewsletterScreen';

type LearnTab = 'newsletter' | 'plans';

const TABS: { label: string; value: LearnTab }[] = [
  { label: 'Newsletter', value: 'newsletter' },
  { label: 'Plans', value: 'plans' },
];

/**
 * The Learn tab's landing screen: a switcher between the free newsletter
 * and Plans, which lives here rather than in its own bottom tab. It was
 * labelled "Fortress" while Fortress was the only thing to buy; with three
 * tiers the pane compares them, so the label names the choice rather than
 * one of the options. Search moved to its own bottom-nav tab (covers
 * exercises and newsletters together), so this screen no longer has its own
 * search field.
 */
export function LearnScreen() {
  const { colors, spacing } = useTheme();
  const maxWidth = useContentMaxWidth();
  const route = useRoute<RouteProp<NewsletterStackParamList, 'Newsletter'>>();
  const requestedTab = route.params?.tab;
  const [tab, setTab] = useState<LearnTab>(requestedTab ?? 'newsletter');

  // Follows the param on every navigation rather than only at mount: the tab
  // keeps this screen mounted, so arriving here a second time from a locked
  // feature would otherwise land on whichever pane was left open.
  //
  // Adjusted during render rather than in an effect — React's documented way
  // to react to a changed prop. An effect would re-render twice and show the
  // wrong pane on the first pass.
  const [lastRequestedTab, setLastRequestedTab] = useState(requestedTab);
  if (requestedTab && requestedTab !== lastRequestedTab) {
    setLastRequestedTab(requestedTab);
    setTab(requestedTab);
  }

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
        {tab === 'newsletter' ? <NewsletterScreen /> : <PlansScreen />}
      </View>
    </View>
  );
}
