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
import { Ball } from '../../types';

interface CurrentState {
  striker: { playerId: string; playerName: string };
  nonStriker: { playerId: string; playerName: string };
  bowler: { playerId: string; playerName: string };
  currentOver: number;
  currentBall: number;
  legalBallsInOver: number;
}

interface NextState extends CurrentState {}

export const BallScoringScreenV4: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [currentState, setCurrentState] = useState<CurrentState | null>(null);
  const [nextState, setNextState] = useState<NextState | null>(null);
  const [liveScore, setLiveScore] = useState<any>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Ball input state
  const [runs, setRuns] = useState(0);
  const [extras, setExtras] = useState<'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye'>('none');
  const [extraRuns, setExtraRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState<string>('');

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      setIsLoading(true);
      await refreshState();
    } catch (error) {
      console.error('Error loading match data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshState = async () => {
    try {
      // Get current state
      const state = await matchesApi.getCurrentState(matchId);
      setCurrentState(state);
      console.log('📊 Current State:', state);

      // Get live score
      const score = await matchesApi.getLiveScore(matchId);
      setLiveScore(score);
      console.log('📈 Live Score:', score);

      // Get balls
      const ballsData = await matchesApi.getBalls(matchId);
      setBalls(ballsData);
    } catch (error: any) {
      console.error('❌ Error refreshing state:', error.message);
      throw error;
    }
  };

  const previewNextState = async () => {
    try {
      if (!currentState) return;

      const preview = await matchesApi.getNextState(matchId, {
        runs,
        extras,
        extraRuns,
        isWicket,
        wicketType: isWicket ? wicketType : undefined,
      });
      setNextState(preview);
      console.log('👀 Next State Preview:', preview);
    } catch (error: any) {
      console.error('Error previewing next state:', error);
      Alert.alert('Error', 'Failed to preview next state');
    }
  };

  const handleRecordBall = async () => {
    if (!currentState) {
      Alert.alert('Error', 'Current state not loaded');
      return;
    }

    // Validate all required fields
    if (!currentState.currentOver || currentState.currentBall === undefined) {
      Alert.alert('Error', 'Current state incomplete - missing over/ball');
      console.error('❌ Incomplete state:', currentState);
      return;
    }

    if (!currentState.striker?.playerId || !currentState.nonStriker?.playerId) {
      Alert.alert('Error', 'Current state incomplete - missing batsmen');
      console.error('❌ Incomplete state:', currentState);
      return;
    }

    if (!currentState.bowler?.playerId) {
      Alert.alert('Error', 'Current state incomplete - missing bowler');
      console.error('❌ Incomplete state:', currentState);
      return;
    }

    if (isWicket && !wicketType) {
      Alert.alert('Error', 'Please select wicket type');
      return;
    }

    try {
      setIsRecording(true);

      const ballData = {
        over: Number(currentState.currentOver),
        ballNumber: Number(currentState.currentBall),
        batsmanId: currentState.striker.playerId,
        nonStrikerId: currentState.nonStriker.playerId,
        bowlerId: currentState.bowler.playerId,
        runs: Number(runs),
        extras,
        extraRuns: Number(extraRuns),
        isWicket,
        wicketType: isWicket ? wicketType : undefined,
      };

      console.log('🎯 Recording ball with data:', ballData);

      await matchesApi.recordBall(matchId, ballData);

      console.log('✅ Ball recorded successfully');
      Alert.alert('Success', 'Ball recorded');

      // Reset form
      setRuns(0);
      setExtras('none');
      setExtraRuns(0);
      setIsWicket(false);
      setWicketType('');
      setNextState(null);

      // Refresh state
      await refreshState();
    } catch (error: any) {
      console.error('❌ Error recording ball:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRecording(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!currentState) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load match state</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current State Section */}
      <View style={styles.stateCard}>
        <Text style={styles.cardTitle}>Current State</Text>
        <View style={styles.stateRow}>
          <View style={styles.playerInfo}>
            <Text style={styles.label}>Striker</Text>
            <Text style={styles.playerName}>{currentState.striker.playerName}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.label}>Non-Striker</Text>
            <Text style={styles.playerName}>{currentState.nonStriker.playerName}</Text>
          </View>
        </View>
        <View style={styles.stateRow}>
          <View style={styles.playerInfo}>
            <Text style={styles.label}>Bowler</Text>
            <Text style={styles.playerName}>{currentState.bowler.playerName}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.label}>Over.Ball</Text>
            <Text style={styles.playerName}>
              {currentState.currentOver}.{currentState.currentBall}
            </Text>
          </View>
        </View>
      </View>

      {/* Live Score Section */}
      {liveScore && (
        <View style={styles.scoreCard}>
          <Text style={styles.cardTitle}>Live Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamName}>{liveScore.battingTeam?.teamName}</Text>
              <Text style={styles.scoreValue}>
                {liveScore.battingTeam?.runs}/{liveScore.battingTeam?.wickets}
              </Text>
              <Text style={styles.scoreOvers}>{liveScore.battingTeam?.overs} overs</Text>
            </View>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreTeamName}>{liveScore.fieldingTeam?.teamName}</Text>
              <Text style={styles.scoreValue}>Fielding</Text>
              <Text style={styles.scoreOvers}>-</Text>
            </View>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreInfoText}>
              Run Rate: {liveScore.battingTeam?.runRate || '0.00'}
            </Text>
            {liveScore.striker && (
              <Text style={styles.scoreInfoText}>
                Striker: {liveScore.striker.playerName} ({liveScore.striker.runs}*)
              </Text>
            )}
            {liveScore.nonStriker && (
              <Text style={styles.scoreInfoText}>
                Non-Striker: {liveScore.nonStriker.playerName} ({liveScore.nonStriker.runs})
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Record Ball Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Record Ball</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Runs</Text>
          <View style={styles.runButtons}>
            {[0, 1, 2, 3, 4, 6].map((run) => (
              <TouchableOpacity
                key={run}
                style={[styles.runButton, runs === run && styles.runButtonActive]}
                onPress={() => {
                  setRuns(run);
                  setNextState(null);
                }}
              >
                <Text
                  style={[styles.runButtonText, runs === run && styles.runButtonTextActive]}
                >
                  {run}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Extras</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={extras}
              onValueChange={(value) => {
                setExtras(value);
                setNextState(null);
              }}
            >
              <Picker.Item label="None" value="none" />
              <Picker.Item label="Wide" value="wide" />
              <Picker.Item label="No-ball" value="no-ball" />
              <Picker.Item label="Bye" value="bye" />
              <Picker.Item label="Leg-bye" value="leg-bye" />
            </Picker>
          </View>
        </View>

        {extras !== 'none' && (
          <View style={styles.section}>
            <Text style={styles.label}>Extra Runs</Text>
            <View style={styles.runButtons}>
              {[0, 1, 2, 3, 4, 5].map((run) => (
                <TouchableOpacity
                  key={run}
                  style={[styles.runButton, extraRuns === run && styles.runButtonActive]}
                  onPress={() => {
                    setExtraRuns(run);
                    setNextState(null);
                  }}
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

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.wicketButton, isWicket && styles.wicketButtonActive]}
            onPress={() => {
              setIsWicket(!isWicket);
              setNextState(null);
            }}
          >
            <Text style={[styles.wicketButtonText, isWicket && styles.wicketButtonTextActive]}>
              {isWicket ? '✓ Wicket' : 'Wicket'}
            </Text>
          </TouchableOpacity>
        </View>

        {isWicket && (
          <View style={styles.section}>
            <Text style={styles.label}>Wicket Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={wicketType}
                onValueChange={(value) => {
                  setWicketType(value);
                  setNextState(null);
                }}
              >
                <Picker.Item label="Select Type" value="" />
                <Picker.Item label="Bowled" value="bowled" />
                <Picker.Item label="LBW" value="lbw" />
                <Picker.Item label="Caught" value="caught" />
                <Picker.Item label="Stumped" value="stumped" />
                <Picker.Item label="Run-out" value="run-out" />
                <Picker.Item label="Hit Wicket" value="hit-wicket" />
              </Picker>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.previewButton, isRecording && styles.buttonDisabled]}
            onPress={previewNextState}
            disabled={isRecording}
          >
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isRecording && styles.buttonDisabled]}
            onPress={handleRecordBall}
            disabled={isRecording}
          >
            <Text style={styles.submitButtonText}>
              {isRecording ? 'Recording...' : 'Record Ball'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next State Preview */}
      {nextState && (
        <View style={styles.previewCard}>
          <Text style={styles.cardTitle}>Next State Preview</Text>
          <View style={styles.stateRow}>
            <View style={styles.playerInfo}>
              <Text style={styles.label}>Striker</Text>
              <Text style={styles.playerName}>{nextState.striker.playerName}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.label}>Non-Striker</Text>
              <Text style={styles.playerName}>{nextState.nonStriker.playerName}</Text>
            </View>
          </View>
          <View style={styles.stateRow}>
            <View style={styles.playerInfo}>
              <Text style={styles.label}>Over.Ball</Text>
              <Text style={styles.playerName}>
                {nextState.currentOver}.{nextState.currentBall}
              </Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.label}>Legal Balls</Text>
              <Text style={styles.playerName}>{nextState.legalBallsInOver}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Previous Balls */}
      {balls.length > 0 && (
        <View style={styles.ballsCard}>
          <Text style={styles.cardTitle}>Recent Balls</Text>
          <FlatList
            data={balls.slice(-6).reverse()}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ballItem}>
                <Text style={styles.ballText}>
                  Over {item.over}.{item.ballNumber}: {item.runs} runs
                  {item.extras !== 'none' && ` (${item.extras})`}
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
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  stateCard: {
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
  previewCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 16,
    color: '#1a1a1a',
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  scoreTeam: {
    alignItems: 'center',
  },
  scoreTeamName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreOvers: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  scoreInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scoreInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
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
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  runButtonActive: {
    backgroundColor: '#007AFF',
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  runButtonTextActive: {
    color: '#fff',
  },
  wicketButton: {
    paddingVertical: 14,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  ballItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ballText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
});
