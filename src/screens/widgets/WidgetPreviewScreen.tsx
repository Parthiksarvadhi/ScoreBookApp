import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LiveMatchWidget } from '../../components/widgets/LiveMatchWidget';
import { theme } from '../../styles/theme';
import { matchesApi } from '../../api/matches';

export const WidgetPreviewScreen = () => {
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadLiveMatches = async () => {
        setLoading(true);
        try {
            const matches = await matchesApi.getMatches();
            // Filter for live/in-progress matches
            const live = matches.filter((m: any) => m.status === 'in_progress');
            setLiveMatches(live);
        } catch (error) {
            console.error('Failed to load matches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLiveMatches();
    }, []);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadLiveMatches} />
            }
        >
            <Text style={styles.title}>Widget Preview</Text>
            <Text style={styles.subtitle}>
                This is how your home screen widgets will look
            </Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Live Matches</Text>
                {liveMatches.length > 0 ? (
                    liveMatches.map((match, index) => (
                        <View key={match.id || index} style={styles.widgetWrapper}>
                            <LiveMatchWidget
                                matchId={match.id}
                                teamA={match.teamA?.name || 'Team A'}
                                teamB={match.teamB?.name || 'Team B'}
                                scoreA={`${match.teamAScore || 0}/${match.teamAWickets || 0}`}
                                scoreB={`${match.teamBScore || 0}/${match.teamBWickets || 0}`}
                                overs={match.currentOver?.toString() || '0.0'}
                                status="live"
                            />
                        </View>
                    ))
                ) : (
                    <View style={styles.widgetWrapper}>
                        <LiveMatchWidget
                            teamA="Sample Team A"
                            teamB="Sample Team B"
                            scoreA="145/3"
                            scoreB="89/2"
                            overs="12.4"
                            status="live"
                        />
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Compact Widget (Small)</Text>
                <View style={styles.widgetWrapper}>
                    <LiveMatchWidget
                        teamA="Mumbai Indians"
                        teamB="Chennai Super Kings"
                        scoreA="178/5"
                        scoreB="145/7"
                        overs="18.2"
                        status="live"
                        compact
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Match</Text>
                <View style={styles.widgetWrapper}>
                    <LiveMatchWidget
                        teamA="Royal Challengers"
                        teamB="Delhi Capitals"
                        scoreA="--"
                        scoreB="--"
                        status="upcoming"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed Match</Text>
                <View style={styles.widgetWrapper}>
                    <LiveMatchWidget
                        teamA="Kolkata Knight Riders"
                        teamB="Sunrisers Hyderabad"
                        scoreA="189/4"
                        scoreB="156/8"
                        status="completed"
                    />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.m,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.l,
    },
    section: {
        marginBottom: theme.spacing.l,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.m,
    },
    widgetWrapper: {
        marginBottom: theme.spacing.m,
    },
});
