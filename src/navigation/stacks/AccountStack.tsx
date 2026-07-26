import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountManagementScreen } from '../../screens/Account/AccountManagementScreen';
import { AccountScreen } from '../../screens/Account/AccountScreen';
import { ChangePasswordScreen } from '../../screens/Account/ChangePasswordScreen';
import { PreferencesScreen } from '../../screens/Account/PreferencesScreen';
import { ProfileSettingsScreen } from '../../screens/Account/ProfileSettingsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type AccountStackParamList = {
  Account: undefined;
  ProfileSettings: undefined;
  Preferences: undefined;
  AccountManagement: undefined;
  ChangePassword: undefined;
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
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
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
    </Stack.Navigator>
  );
}
