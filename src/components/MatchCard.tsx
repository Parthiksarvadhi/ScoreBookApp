import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Match } from '../types';
import { TeamLogo } from './TeamLogo';

interface MatchCardProps {
    match: Match;
    onPress: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live':
                return '#EF4444'; // Red-500
            case 'completed':
                return '#10B981'; // Emerald-500
            case 'scheduled':
                return '#3B82F6'; // Blue-500
            case 'abandoned':
                return '#6B7280'; // Gray-500
            default:
                return '#9CA3AF'; // Gray-400
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'live':
                return '#FEF2F2'; // Red-50
            case 'completed':
                return '#ECFDF5'; // Emerald-50
            case 'scheduled':
                return '#EFF6FF'; // Blue-50
            case 'abandoned':
                return '#F3F4F6'; // Gray-100
            default:
                return '#F9FAFB'; // Gray-50
        }
    };

    const team1 = match.team1 || match.teamA || { name: 'Team 1' } as any;
    const team2 = match.team2 || match.teamB || { name: 'Team 2' } as any;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.matchInfo}>
                    <Text style={styles.matchType}>{match.matchType} • {match.overs} Overs</Text>
                    <Text style={styles.date}>{new Date(match.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(match.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(match.status) }]}>
                        {match.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <Text style={styles.matchName} numberOfLines={2}>
                {match.name}
            </Text>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Venue</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{match.venue}</Text>
                </View>
                <View style={styles.teamsContainer}>
                    <View style={styles.teamRow}>
                        <TeamLogo team={team1} size={24} />
                        <Text style={styles.teamName} numberOfLines={1}>{team1.name}</Text>
                    </View>
                    <Text style={styles.vsText}>vs</Text>
                    <View style={styles.teamRow}>
                        <TeamLogo team={team2} size={24} />
                        <Text style={styles.teamName} numberOfLines={1}>{team2.name}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB', // Gray-200
        // Subtle shadow for depth, but keeping it minimal/flat
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    matchInfo: {
        flex: 1,
    },
    matchType: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280', // Gray-500
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    date: {
        fontSize: 12,
        color: '#9CA3AF', // Gray-400
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    matchName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827', // Gray-900
        marginBottom: 16,
        lineHeight: 24,
    },
    detailsContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6', // Gray-100
        paddingTop: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 13,
        color: '#9CA3AF', // Gray-400
        width: 50,
    },
    detailValue: {
        fontSize: 13,
        color: '#4B5563', // Gray-600
        fontWeight: '500',
        flex: 1,
    },
    teamsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        justifyContent: 'space-between',
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    teamName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151', // Gray-700
        marginLeft: 8,
        flex: 1,
    },
    vsText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginHorizontal: 12,
        fontWeight: '500',
    }
});
