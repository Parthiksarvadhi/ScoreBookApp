import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { matchesApi } from '../../api/matches';
import { Match } from '../../types';
import { useMatchPermissions } from '../../hooks/useMatchPermissions';
import { TeamLogo } from '../../components/TeamLogo';

export const MatchDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const { canEdit } = useMatchPermissions(match);
  const [isLoading, setIsLoading] = useState(true);
  const [ballCount, setBallCount] = useState(0);

  useEffect(() => {
    loadMatch();
  }, []);

  const loadMatch = async () => {
    try {
      const data = await matchesApi.getMatch(matchId);
      setMatch(data);

      // Load balls count only if match is live or completed
      if (data.status !== 'scheduled') {
        try {
          const balls = await matchesApi.getBalls(matchId);
          const ballsArray = Array.isArray(balls) ? balls : [];
          setBallCount(ballsArray.length);
        } catch (error: any) {
          console.log('⚠️ Error loading balls:', error.message);
          setBallCount(0);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load match details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndMatch = async () => {
    Alert.alert('End Match', 'Are you sure you want to end this match?', [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'End Match',
        style: 'destructive',
        onPress: async () => {
          try {
            await matchesApi.endMatch(matchId);
            Alert.alert('Success', 'Match ended');
            loadMatch();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to end match');
          }
        },
      },
    ]);
  };

  const handleResetMatch = async () => {
    Alert.alert(
      'Reset Match',
      'Are you sure you want to reset this match back to scheduled status? This will clear all setup data.',
      [
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await matchesApi.resetMatch(matchId);
              Alert.alert('Success', 'Match reset to scheduled status', [
                { text: 'OK', onPress: () => loadMatch() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reset match');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Match not found</Text>
      </View>
    );
  }

  const renderScheduledView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.headerCard}>
        <Text style={styles.matchTitle}>{match.name}</Text>
        <Text style={styles.matchDate}>
          {new Date(match.createdAt).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>

        <View style={styles.teamsRow}>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team1 || match.teamA} size={60} />
            <Text style={styles.teamNameLarge}>{match.team1?.name || match.teamA?.name || 'Team 1'}</Text>
          </View>
          <Text style={styles.versusText}>vs</Text>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team2 || match.teamB} size={60} />
            <Text style={styles.teamNameLarge}>{match.team2?.name || match.teamB?.name || 'Team 2'}</Text>
          </View>
        </View>

        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.badgeText, { color: '#3B82F6' }]}>SCHEDULED</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[styles.badgeText, { color: '#4B5563' }]}>{match.matchType} • {match.overs} Overs</Text>
          </View>
        </View>
        <Text style={styles.venueText}>📍 {match.venue}</Text>
      </View>

      {canEdit && (
        <View style={styles.actionContainer}>
          <Text style={styles.sectionTitle}>Setup & Actions</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('MatchSetup', { matchId })}
          >
            <Text style={styles.buttonTitle}>Start Match Setup</Text>
            <Text style={styles.buttonSubtitle}>Configure teams, toss, and players</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('EditMatch', { matchId })}
          >
            <Text style={[styles.buttonTitle, { color: '#1F2937' }]}>Edit Match Details</Text>
            <Text style={styles.buttonSubtitle}>Update venue, overs, or type</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderLiveView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.liveHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.liveMatchTitle} numberOfLines={1}>{match.name}</Text>
      </View>

      <View style={styles.scoreCard}>
        {/* Placeholder for real score data - retrieving from match object if available or relying on separate LiveScore component logic */}
        <View style={styles.teamsRow}>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team1 || match.teamA} size={48} />
            <Text style={styles.teamNameLarge}>{match.team1?.name || match.teamA?.name || 'Team 1'}</Text>
          </View>
          <Text style={styles.versusText}>vs</Text>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team2 || match.teamB} size={48} />
            <Text style={styles.teamNameLarge}>{match.team2?.name || match.teamB?.name || 'Team 2'}</Text>
          </View>
        </View>
        <Text style={styles.matchStatusText}>{match.currentInnings === 1 ? '1st Innings' : '2nd Innings'} in progress</Text>
      </View>

      {canEdit ? (
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.bigActionButton, { backgroundColor: '#2563EB' }]}
            onPress={() => navigation.navigate('BallScoring', { matchId })}
          >
            <Text style={styles.bigButtonText}>Record Ball</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.smallActionButton, { backgroundColor: '#F3F4F6' }]}
              onPress={() => navigation.navigate('PublicLiveMatch', { matchId })}
            >
              <Text style={[styles.smallButtonText, { color: '#1F2937' }]}>View Scorecard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallActionButton, { backgroundColor: '#FEE2E2' }]}
              onPress={handleEndMatch}
            >
              <Text style={[styles.smallButtonText, { color: '#EF4444' }]}>End Match</Text>
            </TouchableOpacity>
          </View>

          {ballCount === 0 && (
            <TouchableOpacity
              style={[styles.smallActionButton, { marginTop: 12, backgroundColor: '#FEF3C7' }]}
              onPress={handleResetMatch}
            >
              <Text style={[styles.smallButtonText, { color: '#D97706' }]}>Reset Match</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.viewerActionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('PublicLiveMatch', { matchId })}
          >
            <Text style={styles.buttonTitle}>View Live Scorecard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCompletedView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.headerCard}>
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.badgeText, { color: '#10B981' }]}>COMPLETED</Text>
          </View>
        </View>
        <Text style={styles.matchTitle}>{match.name}</Text>

        <View style={styles.teamsRow}>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team1 || match.teamA} size={60} />
            <Text style={styles.teamNameLarge}>{match.team1?.name || match.teamA?.name || 'Team 1'}</Text>
          </View>
          <Text style={styles.versusText}>vs</Text>
          <View style={styles.teamColumn}>
            <TeamLogo team={match.team2 || match.teamB} size={60} />
            <Text style={styles.teamNameLarge}>{match.team2?.name || match.teamB?.name || 'Team 2'}</Text>
          </View>
        </View>

        <Text style={styles.resultText}>
          {match.winnerTeamId ? `Winner: ${match.winnerTeamId === match.team1Id ? match.team1?.name : match.team2?.name}` : 'Match Completed'}
        </Text>
        <Text style={styles.dateText}>
          {new Date(match.updatedAt || match.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('PublicLiveMatch', { matchId })}
        >
          <Text style={styles.buttonTitle}>View Full Scorecard</Text>
          <Text style={styles.buttonSubtitle}>Detailed stats and ball-by-ball</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {match.status === 'scheduled' && renderScheduledView()}
        {match.status === 'live' && renderLiveView()}
        {match.status === 'completed' && renderCompletedView()}
        {match.status === 'abandoned' && renderCompletedView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Gray-50
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  matchDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  venueText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginTop: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  actionContainer: {
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#2563EB', // Blue-600
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: '#BFDBFE', // Blue-200
  },

  // Live View Styles
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  liveMatchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamNameLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  versusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  matchStatusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionGrid: {
    gap: 16,
  },
  bigActionButton: {
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bigButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  smallActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewerActionContainer: {
    marginTop: 20,
  },

  // Completed View Styles
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669', // Emerald-600
    marginTop: 8,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

