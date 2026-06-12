import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { isOnboardingDone } from "@/lib/storage";
import { router } from "expo-router";
import { AuthGate } from "@/components/AuthGate";
import { PeriodProvider } from "@/lib/periodContext";
import { YearProvider } from "@/lib/yearContext";
import { LanguageProvider } from "@/lib/LanguageProvider";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  useEffect(() => {
    isOnboardingDone().then((done) => {
      if (!done) {
        router.replace("/onboarding");
      }
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="lesson-plans" />
      <Stack.Screen name="create-plan" />
      <Stack.Screen name="view-plan" />
      <Stack.Screen name="classes" />
      <Stack.Screen name="class-detail" />
      <Stack.Screen name="assessments" />
      <Stack.Screen name="student-grades" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="attendance-mark" />
      <Stack.Screen name="statistics" />
      <Stack.Screen name="agenda" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="settings-profile" />
      <Stack.Screen name="settings-ano-letivo" />
      <Stack.Screen name="settings-security" />
      <Stack.Screen name="settings-idioma" />
      <Stack.Screen name="settings-cabecalho" />
      <Stack.Screen name="settings-sobre" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <LanguageProvider>
            <YearProvider>
              <PeriodProvider>
                <AuthGate>
                  <RootLayoutNav />
                </AuthGate>
              </PeriodProvider>
            </YearProvider>
          </LanguageProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
