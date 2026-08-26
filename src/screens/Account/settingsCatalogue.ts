import type { Ionicons } from '@expo/vector-icons';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'units'
  | 'notifications'
  | 'plans'
  | 'perks'
  | 'account'
  | 'data'
  | 'help'
  | 'about';

export interface SettingsItem {
  id: SettingsSectionId;
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Heading this sits under, in both the phone list and the desktop rail. */
  group: string;
  /**
   * The screen to push on a phone. Absent for sections that have no screen
   * of their own and are drawn inline in the detail pane.
   */
  route?: keyof AccountStackParamList;
}

/**
 * Every section of the account centre, once.
 *
 * The phone list and the desktop rail are two presentations of this array
 * rather than two hand-written lists. They drifted before: rows existed in
 * one place and not the other, and the group a row belonged to was decided
 * separately in each. One array means adding a section adds it to both, in
 * the same group, with the same words.
 */
export const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    subtitle: 'Name and photo',
    icon: 'person',
    group: 'Settings',
    route: 'ProfileSettings',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    subtitle: 'Light, dark, or follow the system',
    icon: 'color-palette',
    group: 'Settings',
    route: 'Appearance',
  },
  {
    id: 'units',
    label: 'Units',
    subtitle: 'Weight, distance, and your water goal',
    icon: 'barbell',
    group: 'Settings',
    route: 'Units',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    subtitle: 'Workout reminders and newsletter alerts',
    icon: 'notifications',
    group: 'Settings',
    route: 'Notifications',
  },

  {
    id: 'plans',
    label: 'Plans',
    subtitle: 'Compare Free, Fortress and Valhalla',
    icon: 'pricetags',
    group: 'Membership',
    route: 'Plans',
  },
  {
    id: 'perks',
    label: 'Membership perks',
    subtitle: 'What each plan includes',
    icon: 'sparkles',
    group: 'Membership',
  },

  {
    id: 'account',
    label: 'Account management',
    subtitle: 'Password, sign out, delete account',
    icon: 'settings',
    group: 'Account',
    route: 'AccountManagement',
  },
  {
    id: 'data',
    label: 'Your data',
    subtitle: 'Export your full workout history',
    icon: 'download',
    group: 'Account',
  },

  {
    id: 'help',
    label: 'Help & feedback',
    subtitle: 'FAQs, and a direct line to the team',
    icon: 'help-buoy',
    group: 'Support',
    route: 'Help',
  },
  {
    id: 'about',
    label: 'About',
    subtitle: 'Privacy policy and version',
    icon: 'information-circle',
    group: 'Support',
  },
];

/** The group headings, in the order they should appear, derived rather than repeated. */
export const SETTINGS_GROUPS: string[] = SETTINGS_ITEMS.reduce<string[]>((groups, item) => {
  if (!groups.includes(item.group)) groups.push(item.group);
  return groups;
}, []);
