import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

export const useNotifications = () => {
    const { user, updateProfile } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription>(undefined);
    const responseListener = useRef<Notifications.Subscription>(undefined);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            // Only update if token exists, user is logged in, and token is different
            if (token && user && user.fcmToken !== token) {
                console.log("📝 Updating FCM token...");
                updateProfile({ fcmToken: token } as any).catch(err => {
                    console.error("❌ Failed to update FCM token", err);
                });
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [user]); // Re-run if user changes (handling login/logout)

    return {
        expoPushToken,
        notification,
    };
};

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            Alert.alert('Permission missing', 'Failed to get push token for push notification!');
            return;
        }

        try {
            // We need the raw FCM token for firebase-admin to work
            // getDevicePushTokenAsync returns the native token
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            token = deviceToken.data;
            console.log("🔥 Device (FCM) Token:", token);
            // Alert.alert("FCM Token", token); // Optional: debug
        } catch (e) {
            console.error("Error fetching device push token", e);
            Alert.alert("Token Error", "Failed to get Device Push Token. Are you running on a physical device?");

            // Fallback to Expo Token if Device fails (though backend won't like it without modification)
            try {
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
                if (projectId) {
                    const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                    console.log("⚠️ Fallback to Expo Token:", expoToken);
                    token = expoToken;
                }
            } catch (e2) {
                console.error("Fallback failed", e2);
            }
        }
    } else {
        Alert.alert('Emulator Detected', 'Must use physical device for Push Notifications');
    }

    return token;
}
