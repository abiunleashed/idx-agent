import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { I18nProvider } from '@/i18n';
import { ReviewsProvider } from '@/store/reviews';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <I18nProvider>
        <ReviewsProvider>
          <AnimatedSplashOverlay />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="car/[id]" options={{ title: '', headerBackTitle: '' }} />
            <Stack.Screen name="review/new" options={{ presentation: 'modal', title: '' }} />
          </Stack>
        </ReviewsProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
