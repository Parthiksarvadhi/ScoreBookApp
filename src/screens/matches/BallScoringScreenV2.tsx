import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, Player, Ball } from '../../types';

export const BallScoringScreenV2: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [liveScore, setLiveScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Current ball state
  const [currentOver, setCurrentOver] = useState(0);
  const [currentBall, setCurrentBall] = useState(1);
  const [batsmanId, setBatsmanId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [runs, setRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState('');
  const [extraType, setExtraType] = useState('none');
  const [extraRuns, setExtraRuns] = useState(0);

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);
      console.log('Match data:', matchData);

      if (matchData.team1Id) {
        console.log('Loading players for team:', matchData.team1Id);
        const teamPlayers = await teamsApi.getTeamPlayers(matchData.team1Id);
        console.log('Players loaded:', teamPlayers);
        setPlayers(teamPlayers);
        if (teamPlayers.length > 0) {
          setBatsmanId(teamPlayers[0].id);
          console.log('Batsman set to:', teamPlayers[0].name);
          if (teamPlayers.length > 1) {
            setBowlerId(teamPlayers[1].id);
            console.log('Bowler set to:', teamPlayers[1].name);
          }
        }
      }

      await loadBallsAndScore();
    } catch (error) {
      console.error('Error loading match data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBallsAndScore = async () => {
    try {
      const ballsData = await matchesApi.getBalls(matchId);
      setBalls(ballsData);

      const scoreData = await matchesApi.getLiveScore(matchId);
      setLiveScore(scoreData);

      // Auto-update over and ball number based on last ball
      if (ballsData.length > 0) {
        const lastBall = ballsData[ballsData.length - 1];
        if (lastBall.ballNumber === 6) {
          setCurrentOver(lastBall.over + 1);
          setCurrentBall(1);
        } else {
          setCurrentOver(lastBall.over);
          setCurrentBall(lastBall.ballNumber + 1);
        }
      }
    } catch (error) {
      console.error('Error loading balls and score:', error);
    }
  };

  const handleRecordBall = async () => {
    if (!batsmanId || !bowlerId) {
      Alert.alert('Error', 'Please select batsman and bowler');
      return;
    }

    try {
      await matchesApi.recordBall(matchId, {
        over: currentOver,
        ballNumber: currentBall,
        batsmanId,
        bowlerId,
        runs,
        isWicket,
        wicketType: isWicket ? wicketType : undefined,
        extras: extraType,
        extraRuns,
      });

      Alert.alert('Success', 'Ball recorded');

      // Reset for next ball
      setRuns(0);
      setIsWicket(false);
      setWicketType('');
      setExtraType('none');
      setExtraRuns(0);

      // Handle wicket - ask for new batsman
      if (isWicket) {
        Alert.alert('Wicket!', 'Select new batsman for next ball', [
          { text: 'OK', onPress: () => {} },
        ]);
      }

      // Auto-increment ball number
      if (currentBall === 6) {
        setCurrentOver(currentOver + 1);
        setCurrentBall(1);
        // Bowler changes after over
        Alert.alert('Over Complete', 'Bowler will change for next over');
      } else {
        setCurrentBall(currentBall + 1);
      }

      await loadBallsAndScore();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record ball');
    }
  };

  const handleResetMatch = async () => {
    Alert.alert(
      'Reset Match',
      'Are you sure you want to reset this match back to scheduled status? This will clear all setup data.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await matchesApi.resetMatch(matchId);
              Alert.alert('Success', 'Match reset to scheduled status', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('MatchSetup', { matchId }),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reset match');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.changePlayersButton}
          onPress={() => navigation.navigate('SelectBatsmen', { matchId })}
        >
          <Text style={styles.changePlayersButtonText}>🔄 Change Batsmen/Bowler</Text>
        </TouchableOpacity>
      </View>

      {/* Live Score Section */}
      {liveScore && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Live Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamName}>{liveScore.battingTeam?.name}</Text>
              <Text style={styles.scoreValue}>
                {liveScore.battingTeam?.runs}/{liveScore.battingTeam?.wickets}
              </Text>
              <Text style={styles.scoreOvers}>{liveScore.battingTeam?.overs}</Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreInfoText}>Run Rate: {liveScore.battingTeam?.runRate}</Text>
              <Text style={styles.scoreInfoText}>Balls Left: {liveScore.ballsRemaining}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Current Batsmen & Bowler */}
      <View style={styles.playersCard}>
        <Text style={styles.playersTitle}>Current Players</Text>

        <View style={styles.playerRow}>
          <Text style={styles.playerLabel}>
            Batsman: {players.find((p) => p.id === batsmanId)?.name || 'Select'}
          </Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={batsmanId} onValueChange={setBatsmanId}>
              <Picker.Item label="Select Batsman" value="" />
              {players.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.playerRow}>
          <Text style={styles.playerLabel}>
            Bowler: {players.find((p) => p.id === bowlerId)?.name || 'Select'}
          </Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={bowlerId} onValueChange={setBowlerId}>
              <Picker.Item label="Select Bowler" value="" />
              {players.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Current Ball Info */}
      <View style={styles.ballInfoCard}>
        <Text style={styles.ballInfoTitle}>Current Ball</Text>
        <View style={styles.ballInfoRow}>
          <Text style={styles.ballInfoLabel}>Over {currentOver}.{currentBall}</Text>
        </View>
      </View>

      {/* Ball Details Form */}
      <View style={styles.card}>
        <Text style={styles.title}>Record Ball Details</Text>

        {/* Runs */}
        <View style={styles.section}>
          <Text style={styles.label}>Runs</Text>
          <View style={styles.runButtons}>
            {[0, 1, 2, 3, 4, 6].map((run) => (
              <TouchableOpacity
                key={run}
                style={[styles.runButton, runs === run && styles.runButtonActive]}
                onPress={() => setRuns(run)}
              >
                <Text style={[styles.runButtonText, runs === run && styles.runButtonTextActive]}>
                  {run}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Extras */}
        <View style={styles.section}>
          <Text style={styles.label}>Extras</Text>
          <View style={styles.extrasButtons}>
            {['none', 'wide', 'no-ball', 'bye', 'leg-bye'].map((extra) => (
              <TouchableOpacity
                key={extra}
                style={[styles.extraButton, extraType === extra && styles.extraButtonActive]}
                onPress={() => setExtraType(extra)}
              >
                <Text
                  style={[
                    styles.extraButtonText,
                    extraType === extra && styles.extraButtonTextActive,
                  ]}
                >
                  {extra}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Extra Runs */}
        {extraType !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.label}>Extra Runs</Text>
            <View style={styles.runButtons}>
              {[0, 1, 2, 3].map((run) => (
                <TouchableOpacity
                  key={run}
                  style={[styles.runButton, extraRuns === run && styles.runButtonActive]}
                  onPress={() => setExtraRuns(run)}
                >
                  <Text
                    style={[
                      styles.runButtonText,
                      extraRuns === run && styles.runButtonTextActive,
                    ]}
                  >
                    {run}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Wicket */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.wicketButton, isWicket && styles.wicketButtonActive]}
            onPress={() => setIsWicket(!isWicket)}
          >
            <Text style={[styles.wicketButtonText, isWicket && styles.wicketButtonTextActive]}>
              {isWicket ? '✓ Wicket' : 'Wicket'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wicket Type */}
        {isWicket && (
          <View style={styles.section}>
            <Text style={styles.label}>Wicket Type</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={wicketType} onValueChange={setWicketType}>
                <Picker.Item label="Select Type" value="" />
                <Picker.Item label="Bowled" value="bowled" />
                <Picker.Item label="LBW" value="lbw" />
                <Picker.Item label="Caught" value="caught" />
                <Picker.Item label="Stumped" value="stumped" />
                <Picker.Item label="Run Out" value="run-out" />
                <Picker.Item label="Hit Wicket" value="hit-wicket" />
              </Picker>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleRecordBall}>
          <Text style={styles.submitButtonText}>Record Ball</Text>
        </TouchableOpacity>
      </View>

      {/* Previous Balls */}
      {balls.length > 0 && (
        <View style={styles.ballsCard}>
          <Text style={styles.ballsTitle}>Previous Balls (Last 10)</Text>
          <FlatList
            data={balls.slice(-10).reverse()}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ballItem}>
                <Text style={styles.ballText}>
                  Over {item.over}.{item.ballNumber}: {item.runs} runs
                  {item.extraRuns > 0 && ` + ${item.extraRuns} extra`}
                  {item.isWicket && ' - WICKET'}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePlayersButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  changePlayersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    marginBottom: 16,
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
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreTeam: {
    flex: 1,
  },
  scoreTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreOvers: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: 16,
  },
  scoreInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  playersCard: {
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
  playersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  playerRow: {
    marginBottom: 12,
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  ballInfoCard: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ballInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ballInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ballInfoLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  runButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  runButton: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  runButtonActive: {
    backgroundColor: '#007AFF',
  },
  runButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  runButtonTextActive: {
    color: '#fff',
  },
  extrasButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  extraButtonActive: {
    backgroundColor: '#FF9500',
  },
  extraButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  extraButtonTextActive: {
    color: '#fff',
  },
  wicketButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  wicketButtonActive: {
    backgroundColor: '#FF3B30',
  },
  wicketButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  wicketButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ballsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ballsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  ballItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ballText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
});
