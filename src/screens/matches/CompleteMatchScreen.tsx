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
  FlatList,
} from 'react-native';
import { matchesApi } from '../../api/matches';
import { Match, Ball } from '../../types';

interface BallDisplay {
  id: string;
  over: number;
  ballNumber: number;
  batsmanName: string;
  bowlerName: string;
  runs: number;
  extraRuns: number;
  extras: string;
  isWicket: boolean;
  wicketType?: string;
}

export const CompleteMatchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const matchId: string = route.params?.matchId;
  const [match, setMatch] = useState<Match | null>(null);
  const [balls, setBalls] = useState<BallDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedInnings, setSelectedInnings] = useState(1);

  useEffect(() => {
    loadMatchData();
  }, [selectedInnings]);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      const ballsData = await matchesApi.getBalls(matchId, selectedInnings);
      const ballsArray = Array.isArray(ballsData) ? ballsData : [];

      // Get player names for display
      const ballsWithNames = await Promise.all(
        ballsArray.map(async (ball: any) => {
          // In a real app, you'd fetch player names from the API
          // For now, we'll use the IDs
          return {
            id: ball.id,
            over: ball.over,
            ballNumber: ball.ballNumber,
            batsmanName: ball.batsmanId?.substring(0, 8) || 'Unknown',
            bowlerName: ball.bowlerId?.substring(0, 8) || 'Unknown',
            runs: ball.runs || 0,
            extraRuns: ball.extraRuns || 0,
            extras: ball.extras || 'none',
            isWicket: ball.isWicket || false,
            wicketType: ball.wicketType,
          };
        })
      );

      setBalls(ballsWithNames);
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

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load match data</Text>
      </View>
    );
  }

  // Calculate innings stats
  const calculateStats = () => {
    let runs = 0;
    let wickets = 0;
    let legalBalls = 0;

    for (const ball of balls) {
      runs += ball.runs + ball.extraRuns;
      if (ball.isWicket) wickets++;
      if (ball.extras === 'none' || ball.extras === 'bye' || ball.extras === 'leg-bye') {
        legalBalls++;
      }
    }

    const overs = Math.floor(legalBalls / 6);
    const ballsInOver = legalBalls % 6;
    const oversString = `${overs}.${ballsInOver}`;
    const runRate = legalBalls > 0 ? ((runs / legalBalls) * 6).toFixed(2) : '0.00';

    return { runs, wickets, oversString, legalBalls, runRate };
  };

  const stats = calculateStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Match Header */}
      <View style={styles.header}>
        <Text style={styles.matchTitle}>{match.name}</Text>
        <Text style={styles.matchStatus}>
          Status: {match.status === 'live' ? '🔴 Live' : match.status === 'completed' ? '✅ Completed' : '⏸️ Paused'}
        </Text>
      </View>

      {/* Innings Selector */}
      <View style={styles.inningsSelector}>
        <TouchableOpacity
          style={[styles.inningsButton, selectedInnings === 1 && styles.inningsButtonActive]}
          onPress={() => setSelectedInnings(1)}
        >
          <Text
            style={[
              styles.inningsButtonText,
              selectedInnings === 1 && styles.inningsButtonTextActive,
            ]}
          >
            1st Innings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.inningsButton, selectedInnings === 2 && styles.inningsButtonActive]}
          onPress={() => setSelectedInnings(2)}
        >
          <Text
            style={[
              styles.inningsButtonText,
              selectedInnings === 2 && styles.inningsButtonTextActive,
            ]}
          >
            2nd Innings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Innings Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Innings Summary</Text>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Runs</Text>
            <Text style={styles.summaryValue}>{stats.runs}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Wickets</Text>
            <Text style={styles.summaryValue}>{stats.wickets}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Overs</Text>
            <Text style={styles.summaryValue}>{stats.oversString}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Run Rate</Text>
            <Text style={styles.summaryValue}>{stats.runRate}</Text>
          </View>
        </View>
      </View>

      {/* Match Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Match Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Match Type:</Text>
          <Text style={styles.infoValue}>{match.matchType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Venue:</Text>
          <Text style={styles.infoValue}>{match.venue}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Overs:</Text>
          <Text style={styles.infoValue}>{match.overs}</Text>
        </View>
        {match.tossChoice && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Toss Choice:</Text>
            <Text style={styles.infoValue}>{match.tossChoice === 'bat' ? 'Bat' : 'Field'}</Text>
          </View>
        )}
      </View>

      {/* All Balls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          All Balls ({balls.length})
        </Text>

        {balls.length === 0 ? (
          <Text style={styles.noBallsText}>No balls recorded yet</Text>
        ) : (
          <FlatList
            data={balls}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.ballRow}>
                <View style={styles.ballNumber}>
                  <Text style={styles.ballNumberText}>
                    {item.over}.{item.ballNumber}
                  </Text>
                </View>

                <View style={styles.ballInfo}>
                  <Text style={styles.ballBatsman}>
                    {item.batsmanName}
                  </Text>
                  <Text style={styles.ballBowler}>
                    vs {item.bowlerName}
                  </Text>
                </View>

                <View style={styles.ballRuns}>
                  <Text style={styles.ballRunsText}>
                    {item.runs}
                    {item.extraRuns > 0 && `+${item.extraRuns}`}
                  </Text>
                  {item.extras !== 'none' && (
                    <Text style={styles.ballExtras}>
                      {item.extras}
                    </Text>
                  )}
                </View>

                {item.isWicket && (
                  <View style={styles.wicketBadge}>
                    <Text style={styles.wicketText}>W</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* Innings Stats */}
      {selectedInnings === 1 && match.firstInningsRuns !== undefined && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1st Innings Final</Text>
          <View style={styles.finalStats}>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Runs</Text>
              <Text style={styles.finalStatValue}>{match.firstInningsRuns}</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Wickets</Text>
              <Text style={styles.finalStatValue}>{match.firstInningsWickets}</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Overs</Text>
              <Text style={styles.finalStatValue}>{match.firstInningsOvers}</Text>
            </View>
          </View>
        </View>
      )}

      {selectedInnings === 2 && match.secondInningsRuns !== undefined && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2nd Innings Final</Text>
          <View style={styles.finalStats}>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Runs</Text>
              <Text style={styles.finalStatValue}>{match.secondInningsRuns}</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Wickets</Text>
              <Text style={styles.finalStatValue}>{match.secondInningsWickets}</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Overs</Text>
              <Text style={styles.finalStatValue}>{match.secondInningsOvers}</Text>
            </View>
          </View>
          {match.target && (
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Target: {match.target}</Text>
              <Text style={styles.resultLabel}>
                {match.secondInningsRuns >= match.target ? '✅ Won' : '❌ Lost'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Match Result */}
      {match.status === 'completed' && match.result && (
        <View style={styles.resultCard}>
          <Text style={styles.cardTitle}>Match Result</Text>
          <Text style={styles.resultText}>{match.result}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('LiveMatchView', { matchId })}
        >
          <Text style={styles.buttonText}>Live View</Text>
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
  matchStatus: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  inningsSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inningsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  inningsButtonActive: {
    backgroundColor: '#007AFF',
  },
  inningsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  inningsButtonTextActive: {
    color: '#fff',
  },
  summaryCard: {
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
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  noBallsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    marginBottom: 8,
    borderRadius: 6,
  },
  ballNumber: {
    width: 50,
    alignItems: 'center',
  },
  ballNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ballInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ballBatsman: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  ballBowler: {
    fontSize: 12,
    color: '#666',
  },
  ballRuns: {
    alignItems: 'center',
    marginRight: 12,
  },
  ballRunsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  ballExtras: {
    fontSize: 10,
    color: '#FF9500',
    marginTop: 2,
  },
  wicketBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wicketText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  finalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  finalStatItem: {
    alignItems: 'center',
  },
  finalStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  finalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  targetInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
  },
  resultCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
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
