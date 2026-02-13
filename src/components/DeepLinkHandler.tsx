import React, { useEffect } from 'react';
import { View } from 'react-native';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';

export const DeepLinkHandler = () => {
    const navigation = useNavigation<any>();

    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            handleUrl(event.url);
        };

        const handleUrl = (url: string) => {
            const { path } = Linking.parse(url);
            // Check for scheme: scorebook://invite/<token>
            // Linking.parse might return path="invite/<token>" or just "invite" depending on correct scheme config.

            // Manual parsing to be safe with custom schemes
            if (url.includes('invite')) {
                const parts = url.split('invite/');
                if (parts.length > 1) {
                    const token = parts[1];
                    if (token) {
                        console.log("🔗 Deep Link Token found:", token);
                        // Navigate to InviteAcceptScreen
                        // We need to know where it is registered. We'll put it in ProfileStack.
                        navigation.navigate('ProfileTab', {
                            screen: 'InviteAccept',
                            params: { token }
                        });
                    }
                }
            }
        };

        // Listen for new links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check for initial link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleUrl(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return null; // This component renders nothing
};
