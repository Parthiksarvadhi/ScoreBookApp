import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Team } from '../types';
import { theme } from '../styles/theme';

interface TeamLogoProps {
    team?: {
        name?: string;
        logo?: string;
        primaryColor?: string;
    } | null;
    size?: number;
    showName?: boolean; // If true, renders name next to logo. Useful for headers.
    nameStyle?: TextStyle;
    style?: ViewStyle;
}

import { API_BASE_URL } from '../api/client';

export const TeamLogo: React.FC<TeamLogoProps> = ({
    team,
    size = 40,
    showName = false,
    nameStyle,
    style
}) => {
    const name = team?.name || '?';
    let logoUrl = team?.logo;

    if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('file://')) {
        // Assume relative path from backend
        logoUrl = `${API_BASE_URL}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
        // Add cache buster
        logoUrl += `?t=${Date.now()}`;
    }

    if (logoUrl) {
        console.log('🖼️ TeamLogo URL:', name, logoUrl);
    }

    // Generate initials (max 2 chars)
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // energetic colors for fallback
    const fallbackColors = [
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#3B82F6', // Blue
        '#6366F1', // Indigo
        '#8B5CF6', // Violet
        '#EC4899', // Pink
    ];

    // Deterministic color based on name length
    const bgIndex = name.length % fallbackColors.length;
    const backgroundColor = team?.primaryColor || fallbackColors[bgIndex];

    return (
        <View style={[styles.container, style]}>
            <View
                style={[
                    styles.logoContainer,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: logoUrl ? 'transparent' : backgroundColor,
                    },
                ]}
            >
                {logoUrl ? (
                    <Image
                        source={{ uri: logoUrl }}
                        style={{ width: size, height: size, borderRadius: size / 2 }}
                        resizeMode="cover"
                        onError={(e) => {
                            console.error('❌ TeamLogo Load Error:', name);
                            console.error('   - URL:', logoUrl);
                            console.error('   - Error:', e.nativeEvent.error);
                        }}
                    />
                ) : (
                    <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
                        {initials}
                    </Text>
                )}
            </View>

            {showName && (
                <Text style={[styles.name, nameStyle]}>
                    {name}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    initials: {
        color: '#fff',
        fontWeight: 'bold',
    },
    name: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
});
