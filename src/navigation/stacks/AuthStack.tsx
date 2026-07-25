import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ForgotPasswordScreen } from '../../screens/Auth/ForgotPasswordScreen';
import { SignInScreen } from '../../screens/Auth/SignInScreen';
import { SignUpScreen } from '../../screens/Auth/SignUpScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
