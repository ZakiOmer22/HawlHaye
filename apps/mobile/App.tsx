import React from "react";
import { View, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { AuthProvider } from "./src/auth/AuthContext";
import { PrefsProvider, usePrefs } from "./src/prefs";
import { RootNavigator } from "./src/navigation/RootNavigator";


function Root() {
  const { isRtl, palette } = usePrefs();
  return (
    <View style={{ flex: 1, backgroundColor: palette.app, direction: isRtl ? "rtl" : "ltr" }}>
      {/* The mobile Shell uses a dark top header; keep Android status icons white. */}
      <StatusBar barStyle="light-content" backgroundColor="#0A101F" translucent={false} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}


export default function App() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <Root />
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
