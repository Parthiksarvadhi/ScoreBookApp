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
import { TeamLogo } from '../../components/TeamLogo';

export const BallScoringScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [liveScore, setLiveScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [over, setOver] = useState('0');
  const [ballNumber, setBallNumber] = useState('1');
  const [batsmanId, setBatsmanId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [runs, setRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      // Load players from team1
      if (matchData.team1Id) {
        const teamPlayers = await teamsApi.getTeamPlayers(matchData.team1Id);
        setPlayers(teamPlayers);
        if (teamPlayers.length > 0) {
          setBatsmanId(teamPlayers[0].id);
        }
      }

      // Load balls and live score
      await loadBallsAndScore();
    } catch (error) {
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
      console.log('📊 Live Score Data:', JSON.stringify(scoreData, null, 2));
      setLiveScore(scoreData);
    } catch (error: any) {
      console.error('❌ Error loading balls and score:', error.message);
      console.error('Error details:', error);
    }
  };

  const handleRecordBall = async () => {
    if (!batsmanId || !bowlerId) {
      Alert.alert('Error', 'Please select batsman and bowler');
      return;
    }

    try {
      await matchesApi.recordBall(matchId, {
        over: parseInt(over),
        ballNumber: parseInt(ballNumber),
        batsmanId,
        bowlerId,
        runs,
        isWicket,
      });
      Alert.alert('Success', 'Ball recorded');
      setRuns(0);
      setIsWicket(false);
      setBallNumber(String(parseInt(ballNumber) + 1));

      // Reload balls and score
      await loadBallsAndScore();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record ball');
    }
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
      {/* Live Score Section */}
      {liveScore ? (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Live Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreTeam}>
              <TeamLogo
                team={match?.team1Id === liveScore.battingTeam?.teamId ? match?.team1 : match?.team2}
                size={40}
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.scoreTeamName}>{liveScore.battingTeam?.teamName || 'Batting Team'}</Text>
              <Text style={styles.scoreValue}>
                {liveScore.battingTeam?.runs || 0}/{liveScore.battingTeam?.wickets || 0}
              </Text>
              <Text style={styles.scoreOvers}>{liveScore.battingTeam?.overs || '0.0'} overs</Text>
            </View>
            <View style={styles.scoreTeam}>
              <TeamLogo
                team={match?.team1Id === liveScore.fieldingTeam?.teamId ? match?.team1 : match?.team2}
                size={40}
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.scoreTeamName}>{liveScore.fieldingTeam?.teamName || 'Fielding Team'}</Text>
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
      ) : (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Live Score</Text>
          <Text style={styles.scoreInfoText}>Loading score...</Text>
        </View>
      )}

      {/* Previous Balls Section */}
      {balls.length > 0 && (
        <View style={styles.ballsCard}>
          <Text style={styles.ballsTitle}>Previous Balls</Text>
          <FlatList
            data={balls.slice(-6)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ballItem}>
                <Text style={styles.ballText}>
                  Over {item.over}.{item.ballNumber}: {item.runs} runs
                  {item.isWicket && ' - WICKET'}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Record Ball Form */}
      <View style={styles.card}>
        <Text style={styles.title}>Record Ball</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Over</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={over} onValueChange={setOver}>
              {[0, 1, 2, 3, 4, 5].map((o) => (
                <Picker.Item key={o} label={String(o)} value={String(o)} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Ball Number</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={ballNumber} onValueChange={setBallNumber}>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <Picker.Item key={b} label={String(b)} value={String(b)} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Batsman</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={batsmanId} onValueChange={setBatsmanId}>
              <Picker.Item label="Select Batsman" value="" />
              {players.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bowler</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={bowlerId} onValueChange={setBowlerId}>
              <Picker.Item label="Select Bowler" value="" />
              {players.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>
        </View>

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

        <TouchableOpacity style={styles.submitButton} onPress={handleRecordBall}>
          <Text style={styles.submitButtonText}>Record Ball</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-around',
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
  ballsCard: {
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
    fontSize: 14,
    color: '#1a1a1a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1a1a1a',
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
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
