import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, Player } from '../../types';

interface LiveScore {
  matchId: string;
  currentInnings: number;
  battingTeam: {
    teamId: string;
    teamName: string;
    runs: number;
    wickets: number;
    overs: string;
    ballsFaced: number;
    runRate: number;
  };
  fieldingTeam: {
    teamId: string;
    teamName: string;
  };
  striker: {
    playerId: string;
    playerName: string;
    runs: number;
    ballsFaced: number;
  } | null;
  nonStriker: {
    playerId: string;
    playerName: string;
    runs: number;
    ballsFaced: number;
  } | null;
  bowler: {
    playerId: string;
    playerName: string;
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
  } | null;
  currentOver: number;
  currentBall: number;
  target?: number;
  ballsRemaining?: number;
  runsNeeded?: number;
  requiredRunRate?: number;
  firstInningsTotal?: {
    runs: number;
    wickets: number;
    overs: string;
  };
}

export const LiveMatchViewScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const matchId: string = route.params?.matchId;
  const [match, setMatch] = useState<Match | null>(null);
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadMatchData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadMatchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      const scoreData = await matchesApi.getLiveScore(matchId);
      setLiveScore(scoreData);
    } catch (error) {
      console.error('Error loading match data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMatchData();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!match || !liveScore) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load match data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Match Header */}
      <View style={styles.header}>
        <Text style={styles.matchTitle}>{match.name}</Text>
        <Text style={styles.inningsIndicator}>
          {liveScore.currentInnings === 1 ? '1st Innings' : '2nd Innings'}
        </Text>
      </View>

      {/* Toss Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Toss</Text>
        <View style={styles.tossInfo}>
          <Text style={styles.tossText}>
            {match.tossWinnerId ? 'Toss won by: ' : 'Toss: Not decided'}
          </Text>
          <Text style={styles.tossChoice}>
            {match.tossChoice === 'bat' ? 'Chose to bat' : 'Chose to field'}
          </Text>
        </View>
      </View>

      {/* Playing 11 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Playing 11</Text>

        {/* Batting Team Playing 11 */}
        <View style={styles.playing11Section}>
          <Text style={styles.teamLabel}>🏏 {liveScore.battingTeam.teamName} (Batting)</Text>
          <View style={styles.playersList}>
            {match.teamAId === liveScore.battingTeam.teamId
              ? match.teamAPlaying11?.map((playerId: string) => (
                <Text key={playerId} style={styles.playerItem}>
                  • Player {playerId.substring(0, 8)}
                </Text>
              ))
              : match.teamBPlaying11?.map((playerId: string) => (
                <Text key={playerId} style={styles.playerItem}>
                  • Player {playerId.substring(0, 8)}
                </Text>
              ))}
          </View>
        </View>

        {/* Fielding Team Playing 11 */}
        <View style={styles.playing11Section}>
          <Text style={styles.teamLabel}>🎯 {liveScore.fieldingTeam.teamName} (Fielding)</Text>
          <View style={styles.playersList}>
            {match.teamAId === liveScore.fieldingTeam.teamId
              ? match.teamAPlaying11?.map((playerId: string) => (
                <Text key={playerId} style={styles.playerItem}>
                  • Player {playerId.substring(0, 8)}
                </Text>
              ))
              : match.teamBPlaying11?.map((playerId: string) => (
                <Text key={playerId} style={styles.playerItem}>
                  • Player {playerId.substring(0, 8)}
                </Text>
              ))}
          </View>
        </View>
      </View>

      {/* Live Score */}
      <View style={styles.scoreCard}>
        <Text style={styles.cardTitle}>Live Score</Text>

        {/* Batting Team Score */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreHeader}>
            <Text style={styles.teamName}>{liveScore.battingTeam.teamName}</Text>
            <Text style={styles.scoreValue}>
              {liveScore.battingTeam.runs}/{liveScore.battingTeam.wickets}
            </Text>
          </View>
          <View style={styles.scoreDetails}>
            <View style={styles.scoreDetail}>
              <Text style={styles.scoreLabel}>Overs</Text>
              <Text style={styles.scoreDetailValue}>{liveScore.battingTeam.overs}</Text>
            </View>
            <View style={styles.scoreDetail}>
              <Text style={styles.scoreLabel}>Run Rate</Text>
              <Text style={styles.scoreDetailValue}>{liveScore.battingTeam.runRate}</Text>
            </View>
            <View style={styles.scoreDetail}>
              <Text style={styles.scoreLabel}>Balls</Text>
              <Text style={styles.scoreDetailValue}>{liveScore.battingTeam.ballsFaced}</Text>
            </View>
          </View>
        </View>

        {/* Current Over and Ball */}

      </View>

      {/* Current Batsmen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Batsmen</Text>

        {liveScore.striker && (
          <View style={styles.batsman}>
            <Text style={styles.batsmanLabel}>⚡ Striker</Text>
            <Text style={styles.batsmanName}>{liveScore.striker.playerName}</Text>
            <View style={styles.batsmanStats}>
              <Text style={styles.batsmanStat}>
                Runs: {liveScore.striker.runs}
              </Text>
              <Text style={styles.batsmanStat}>
                Balls: {liveScore.striker.ballsFaced}
              </Text>
              {liveScore.striker.ballsFaced > 0 && (
                <Text style={styles.batsmanStat}>
                  SR: {((liveScore.striker.runs / liveScore.striker.ballsFaced) * 100).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        )}

        {liveScore.nonStriker && (
          <View style={styles.batsman}>
            <Text style={styles.batsmanLabel}>Non-Striker</Text>
            <Text style={styles.batsmanName}>{liveScore.nonStriker.playerName}</Text>
            <View style={styles.batsmanStats}>
              <Text style={styles.batsmanStat}>
                Runs: {liveScore.nonStriker.runs}
              </Text>
              <Text style={styles.batsmanStat}>
                Balls: {liveScore.nonStriker.ballsFaced}
              </Text>
              {liveScore.nonStriker.ballsFaced > 0 && (
                <Text style={styles.batsmanStat}>
                  SR: {((liveScore.nonStriker.runs / liveScore.nonStriker.ballsFaced) * 100).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Current Bowler */}
      {liveScore.bowler && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Bowler</Text>
          <View style={styles.bowler}>
            <Text style={styles.bowlerName}>🎯 {liveScore.bowler.playerName}</Text>
            <View style={styles.bowlerStats}>
              <Text style={styles.bowlerStat}>
                Balls: {liveScore.bowler.ballsBowled}
              </Text>
              <Text style={styles.bowlerStat}>
                Runs: {liveScore.bowler.runsConceded}
              </Text>
              <Text style={styles.bowlerStat}>
                Wickets: {liveScore.bowler.wickets}
              </Text>
              {liveScore.bowler.ballsBowled > 0 && (
                <Text style={styles.bowlerStat}>
                  Economy: {((liveScore.bowler.runsConceded / liveScore.bowler.ballsBowled) * 6).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Second Innings Info */}
      {liveScore.currentInnings === 2 && liveScore.firstInningsTotal && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Match Status</Text>

          <View style={styles.inningsInfo}>
            <View style={styles.inningsColumn}>
              <Text style={styles.inningsLabel}>First Innings</Text>
              <Text style={styles.inningsValue}>
                {liveScore.firstInningsTotal.runs}/{liveScore.firstInningsTotal.wickets}
              </Text>
              <Text style={styles.inningsOvers}>{liveScore.firstInningsTotal.overs}</Text>
            </View>
          </View>

          <View style={styles.targetInfo}>
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Target:</Text>
              <Text style={styles.targetValue}>{liveScore.target}</Text>
            </View>
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Runs Needed:</Text>
              <Text style={styles.targetValue}>{liveScore.runsNeeded}</Text>
            </View>
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Balls Remaining:</Text>
              <Text style={styles.targetValue}>{liveScore.ballsRemaining}</Text>
            </View>
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Required RR:</Text>
              <Text style={styles.targetValue}>{liveScore.requiredRunRate}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('BallScoringScreenV3', { matchId })}
        >
          <Text style={styles.buttonText}>Record Ball</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onRefresh}
        >
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  inningsIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  tossInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  tossText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tossChoice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  playing11Section: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  playersList: {
    marginLeft: 8,
  },
  playerItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreDetail: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  currentBallInfo: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  currentBallLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  currentBallValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  batsman: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  batsmanLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  batsmanStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  batsmanStat: {
    fontSize: 12,
    color: '#666',
  },
  bowler: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  bowlerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  bowlerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  bowlerStat: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    width: '48%',
  },
  inningsInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inningsColumn: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
  },
  inningsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  inningsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  inningsOvers: {
    fontSize: 11,
    color: '#999',
  },
  targetInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  targetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
