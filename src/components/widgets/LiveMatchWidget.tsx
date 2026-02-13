import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface LiveMatchWidgetProps {
    matchId?: string;
    teamA?: string;
    teamB?: string;
    scoreA?: string;
    scoreB?: string;
    overs?: string;
    status?: 'live' | 'upcoming' | 'completed';
    compact?: boolean;
}

export const LiveMatchWidget: React.FC<LiveMatchWidgetProps> = ({
    teamA = 'Team A',
    teamB = 'Team B',
    scoreA = '0/0',
    scoreB = '0/0',
    overs = '0.0',
    status = 'live',
    compact = false,
}) => {
    const getStatusColor = () => {
        switch (status) {
            case 'live':
                return theme.colors.error;
            case 'upcoming':
                return theme.colors.warning;
            case 'completed':
                return theme.colors.success;
            default:
                return theme.colors.text.secondary;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'live':
                return '● LIVE';
            case 'upcoming':
                return 'UPCOMING';
            case 'completed':
                return 'COMPLETED';
            default:
                return '';
        }
    };

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={styles.compactHeader}>
                    <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                </View>
                <View style={styles.compactScores}>
                    <View style={styles.compactTeam}>
                        <Text style={styles.compactTeamName} numberOfLines={1}>{teamA}</Text>
                        <Text style={styles.compactScore}>{scoreA}</Text>
                    </View>
                    <Text style={styles.compactVs}>vs</Text>
                    <View style={styles.compactTeam}>
                        <Text style={styles.compactTeamName} numberOfLines={1}>{teamB}</Text>
                        <Text style={styles.compactScore}>{scoreB}</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
                    {getStatusText()}
                </Text>
                {status === 'live' && (
                    <Text style={styles.overs}>Overs: {overs}</Text>
                )}
            </View>

            <View style={styles.scoreContainer}>
                <View style={styles.teamRow}>
                    <Text style={styles.teamName}>{teamA}</Text>
                    <Text style={styles.score}>{scoreA}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.teamRow}>
                    <Text style={styles.teamName}>{teamB}</Text>
                    <Text style={styles.score}>{scoreB}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        ...theme.shadows.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    overs: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        fontWeight: '600',
    },
    scoreContainer: {
        gap: theme.spacing.s,
    },
    teamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    teamName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        flex: 1,
    },
    score: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.xs,
    },
    // Compact styles for widget
    compactContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 12,
        minHeight: 100,
    },
    compactHeader: {
        marginBottom: 8,
    },
    compactScores: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compactTeam: {
        flex: 1,
        alignItems: 'center',
    },
    compactTeamName: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    compactScore: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    compactVs: {
        fontSize: 10,
        color: theme.colors.text.secondary,
        marginHorizontal: 8,
    },
});
