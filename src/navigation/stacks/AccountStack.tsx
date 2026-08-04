import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountManagementScreen } from '../../screens/Account/AccountManagementScreen';
import { AccountScreen } from '../../screens/Account/AccountScreen';
import { AppearanceScreen } from '../../screens/Account/AppearanceScreen';
import { ChangePasswordScreen } from '../../screens/Account/ChangePasswordScreen';
import { HelpScreen } from '../../screens/Account/HelpScreen';
import { NotificationsScreen } from '../../screens/Account/NotificationsScreen';
import { ProfileSettingsScreen } from '../../screens/Account/ProfileSettingsScreen';
import { UnitsScreen } from '../../screens/Account/UnitsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type AccountStackParamList = {
  Account: undefined;
  ProfileSettings: undefined;
  Appearance: undefined;
  Units: undefined;
  Notifications: undefined;
  AccountManagement: undefined;
  ChangePassword: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: 'Profile Settings' }}
      />
      <Stack.Screen name="Appearance" component={AppearanceScreen} />
      <Stack.Screen name="Units" component={UnitsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="AccountManagement"
        component={AccountManagementScreen}
        options={{ title: 'Account Management' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & Feedback' }} />
    </Stack.Navigator>
  );
}
