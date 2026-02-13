import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
  StatusBar,
} from 'react-native';
import { matchesApi } from '../../api/matches';
import { Match } from '../../types';
import { theme } from '../../styles/theme';
import { Feather } from '@expo/vector-icons';
import { TeamLogo } from '../../components/TeamLogo';

export const AllLiveMatchesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'live' | 'completed'>('all');

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMatches = async () => {
    try {
      const allMatches = await matchesApi.getMatches();
      setMatches(allMatches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMatches();
  };

  const getFilteredMatches = () => {
    if (selectedFilter === 'live') {
      return matches.filter(m => m.status === 'live');
    } else if (selectedFilter === 'completed') {
      return matches.filter(m => m.status === 'completed');
    }
    return matches;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#EF4444'; // Red
      case 'completed': return theme.colors.primary; // Green
      case 'scheduled': return theme.colors.secondary; // Blue
      default: return theme.colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'completed': return 'FINISHED';
      case 'scheduled': return 'UPCOMING';
      default: return status.toUpperCase();
    }
  };

  const getBattingInnings = (match: Match, teamId: string | undefined) => {
    if (!teamId || !match.tossWinnerId || !match.tossChoice) return null;

    const isTossWinner = match.tossWinnerId === teamId;
    const choseToBat = match.tossChoice === 'bat';

    // If toss winner chose bat, they are 1st innings.
    // If toss winner chose field, they are 2nd innings (so opponent is 1st).
    const isFirstInnings = (isTossWinner && choseToBat) || (!isTossWinner && !choseToBat);

    return isFirstInnings ? 1 : 2;
  };

  const getTeamScore = (match: Match, teamId: string | undefined) => {
    const innings = getBattingInnings(match, teamId);
    if (!innings) return null;

    if (innings === 1) {
      if (match.firstInningsRuns === undefined) return null;
      return {
        runs: match.firstInningsRuns,
        wickets: match.firstInningsWickets || 0,
        overs: match.firstInningsOvers || '0.0',
        played: true
      };
    } else {
      // Show 2nd innings score only if it has started (or if match is live/completed and it's 2nd innings)
      if (match.currentInnings === 2 || match.status === 'completed' || match.secondInningsRuns !== undefined) {
        // Check if the innings actually started data-wise
        if (match.secondInningsRuns === undefined && (match.currentInnings || 0) < 2) return null;

        return {
          runs: match.secondInningsRuns || 0,
          wickets: match.secondInningsWickets || 0,
          overs: match.secondInningsOvers || '0.0',
          played: true
        };
      }
      return null;
    }
  };

  const getResultText = (match: Match) => {
    if (match.status === 'scheduled') {
      return `Starts at ${new Date(match.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (match.status === 'live') {
      if (match.currentInnings === 2 && match.target) {
        const runsNeeded = Math.max(0, match.target - (match.secondInningsRuns || 0));
        // Calculate balls remaining roughly or if we had it from API. 
        // For card view, "Match in Progress" or "Target: X" is safe.
        return `Target: ${match.target} • Need ${runsNeeded} runs`;
      }
      return 'Match in Progress';
    }

    if (match.status === 'completed') {
      if (match.resultType === 'tie') return 'Match Tied';

      if (match.winnerTeamId && match.resultType && match.margin !== undefined) {
        const winnerTeam = match.winnerTeamId === match.teamAId ? match.teamA : match.teamB;
        const winnerName = winnerTeam?.name || 'Winner';
        const marginText = match.resultType === 'win-by-runs' ? 'runs' : 'wickets';
        return `${winnerName} won by ${match.margin} ${marginText}`;
      }

      return 'Match Completed';
    }

    return '';
  };

  const filteredMatches = getFilteredMatches();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderSegmentedControl = () => (
    <View style={styles.segmentContainer}>
      {(['all', 'live', 'completed'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.segmentButton,
            selectedFilter === filter && styles.segmentButtonActive
          ]}
          onPress={() => setSelectedFilter(filter)}
        >
          <Text style={[
            styles.segmentText,
            selectedFilter === filter && styles.segmentTextActive
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      {/* Header Area */}
      <View style={styles.header}>
        {renderSegmentedControl()}
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const scoreA = getTeamScore(item, item.teamAId);
          const scoreB = getTeamScore(item, item.teamBId);
          const result = getResultText(item);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (item.status === 'live' || item.status === 'completed') {
                  navigation.navigate('LiveViewMatch', { matchId: item.id });
                } else {
                  Alert.alert('Info', 'Match has not started yet');
                }
              }}
              activeOpacity={0.7}
            >
              {/* Status Badge */}
              <View style={styles.cardHeader}>
                <Text style={styles.matchTypeVenue}>
                  {item.matchType} • {item.venue}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              {/* Teams & Scores */}
              <View style={styles.matchContent}>
                {/* Team A */}
                <View style={styles.teamRow}>
                  <View style={styles.teamNameContainer}>
                    <TeamLogo team={item.teamA} size={32} style={{ marginRight: 8 }} />
                    <Text style={styles.teamName}>{item.teamA?.name || 'Team A'}</Text>
                  </View>
                  <View style={styles.scoreContainer}>
                    {scoreA ? (
                      <Text style={styles.scoreText}>
                        {scoreA.runs}/{scoreA.wickets}
                        <Text style={styles.oversText}>
                          {` (${scoreA.overs})`}
                        </Text>
                      </Text>
                    ) : <Text style={styles.oversText}>Yet to Bat</Text>}
                  </View>
                </View>

                {/* Team B */}
                <View style={styles.teamRow}>
                  <View style={styles.teamNameContainer}>
                    <TeamLogo team={item.teamB} size={32} style={{ marginRight: 8 }} />
                    <Text style={styles.teamName}>{item.teamB?.name || 'Team B'}</Text>
                  </View>
                  <View style={styles.scoreContainer}>
                    {scoreB ? (
                      <Text style={styles.scoreText}>
                        {scoreB.runs}/{scoreB.wickets}
                        <Text style={styles.oversText}>
                          {` (${scoreB.overs})`}
                        </Text>
                      </Text>
                    ) : <Text style={styles.oversText}>Yet to Bat</Text>}
                  </View>
                </View>

                {/* Status/Result Text */}
                <View style={styles.resultContainer}>
                  <Text style={styles.resultText}>
                    {result}
                  </Text>
                </View>
              </View>

            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={48} color={theme.colors.text.hint} />
            <Text style={styles.emptyText}>No matches found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.round, // Pill shape
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  segmentTextActive: {
    color: theme.colors.text.primary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    ...theme.shadows.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    paddingBottom: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  matchTypeVenue: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  matchContent: {
    gap: theme.spacing.s,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4', // Light green
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  teamName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  oversText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  resultContainer: {
    marginTop: theme.spacing.s,
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resultText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600', // Emphasize result
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.m,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
});
