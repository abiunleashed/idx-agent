import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { I18nProvider } from '@/i18n';
import { AuthProvider } from '@/store/auth';
import { CatalogProvider } from '@/store/catalog';
import { ReviewsProvider } from '@/store/reviews';
import { VotesProvider } from '@/store/votes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <I18nProvider>
        <AuthProvider>
          <CatalogProvider>
            <ReviewsProvider>
              <VotesProvider>
                <AnimatedSplashOverlay />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="car/[id]" options={{ title: '', headerBackTitle: '' }} />
                  <Stack.Screen name="review/new" options={{ presentation: 'modal', title: '' }} />
                  <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: '' }} />
                </Stack>
              </VotesProvider>
            </ReviewsProvider>
          </CatalogProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
