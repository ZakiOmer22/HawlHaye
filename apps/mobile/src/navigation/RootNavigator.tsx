import React from "react";
import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useAuth } from "../auth/AuthContext";
import { RealtimeProvider } from "../realtime/RealtimeProvider";
import { Shell } from "../components/Shell";
import { Loading } from "../components/ui";
import { usePrefs } from "../prefs";
import { WEB_ORIGIN } from "../config";
import { AcceptInviteScreen, ChangePasswordScreen, ForgotPasswordScreen, LockScreen, LoginScreen, ResetPasswordScreen } from "../screens/Auth";
import { BoardScreen } from "../screens/Board";
import { DelegationsScreen, MyTasksScreen, ReviewScreen } from "../screens/Lists";
import { TaskDetailScreen } from "../screens/TaskDetail";
import { DashboardScreen, ProfileScreen } from "../screens/TabScreens";
import { SearchScreen, SecurityScreen } from "../screens/CreateSearchSecurity";
import { AuditScreen, TicketDetailScreen, TicketsScreen, UsersScreen } from "../screens/MoreScreens";
import type { AuthStackParams, MainStackParams } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const MainStack = createNativeStackNavigator<MainStackParams>();

const linking: LinkingOptions<AuthStackParams> = {
  prefixes: [Linking.createURL("/"), "hawlhaye://", WEB_ORIGIN],
  config: { screens: { AcceptInvite: "accept-invite", ResetPassword: "reset-password" } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inShell<P extends object>(C: React.ComponentType<P>, active: keyof MainStackParams) {
  return function Wrapped(props: P) { return <Shell active={active}><C {...props} /></Shell>; };
}
const Dashboard = inShell(DashboardScreen, "Dashboard");
const Profile = inShell(ProfileScreen, "Profile");
const Security = inShell(SecurityScreen, "Profile");
const Search = inShell(SearchScreen, "Board");
const Tickets = inShell(TicketsScreen, "Tickets");
const TicketDetail = inShell(TicketDetailScreen, "Tickets");
const Users = inShell(UsersScreen, "Users");
const Audit = inShell(AuditScreen, "Audit");
const ChangePw = inShell(() => <ChangePasswordScreen />, "Profile");

function MainNavigator() {
  return (
    <RealtimeProvider>
      <MainStack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        <MainStack.Screen name="Board" component={BoardScreen} />
        <MainStack.Screen name="MyTasks" component={MyTasksScreen} />
        <MainStack.Screen name="Delegations" component={DelegationsScreen} />
        <MainStack.Screen name="Review" component={ReviewScreen} />
        <MainStack.Screen name="Dashboard" component={Dashboard} />
        <MainStack.Screen name="Profile" component={Profile} />
        <MainStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ animation: "slide_from_right" }} />
        <MainStack.Screen name="Search" component={Search} />
        <MainStack.Screen name="Security" component={Security} />
        <MainStack.Screen name="ChangePassword" component={ChangePw} />
        <MainStack.Screen name="Tickets" component={Tickets} />
        <MainStack.Screen name="TicketDetail" component={TicketDetail} options={{ animation: "slide_from_right" }} />
        <MainStack.Screen name="Users" component={Users} />
        <MainStack.Screen name="Audit" component={Audit} />
      </MainStack.Navigator>
    </RealtimeProvider>
  );
}

export function RootNavigator() {
  const { status, user } = useAuth();
  const { palette: c, theme } = usePrefs();
  const base = theme === "light" ? DefaultTheme : DarkTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: c.app, card: c.panel, text: c.primary, border: c.border, primary: c.accent } };

  let body: React.ReactNode;
  if (status === "loading") body = <Loading />;
  else if (status === "locked") body = <LockScreen />;
  else if (status === "signedOut") {
    body = (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <AuthStack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
      </AuthStack.Navigator>
    );
  } else if (user?.mustChangePassword) body = <ChangePasswordScreen forced />;
  else body = <MainNavigator />;

  return <NavigationContainer theme={navTheme} linking={linking}>{body}</NavigationContainer>;
}
