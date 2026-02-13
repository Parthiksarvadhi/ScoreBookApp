import React from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { Provider } from 'react-redux';
import { store } from '../src/store';

import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSequence,
  withSpring
} from 'react-native-reanimated';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load any resources or data that we need prior to rendering the app
        // For now, we just simulate a short loading time
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide it only once we know the root view has already performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Provider store={store}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </Provider>
      {!splashAnimationFinished && (
        <SplashScreenAnimation onAnimationFinish={() => setSplashAnimationFinished(true)} />
      )}
    </View>
  );
}

function SplashScreenAnimation({ onAnimationFinish }: { onAnimationFinish: () => void }) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    // Start animation sequence
    scale.value = withSequence(
      withSpring(1.1),
      withTiming(1, { duration: 500 }),
      withTiming(10, { duration: 800 }, (finished) => {
        if (finished) {
          opacity.value = withTiming(0, { duration: 400 }, (finished) => {
            if (finished) {
              runOnJS(onAnimationFinish)();
            }
          });
        }
      })
    );
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, containerStyle]}>
      <Animated.Image
        source={require('../assets/images/logo.png')}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,

    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it sits on top of everything
  },
  logo: {
    width: 200,
    height: 200,
  },
});
