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
import { PickerSelect } from '../../components/PickerSelect';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, Player } from '../../types';
import { useMatchPermissions } from '../../hooks/useMatchPermissions';
import { TeamLogo } from '../../components/TeamLogo';

type SetupStep = 'toss' | 'playing11' | 'captains' | 'batting-order' | 'ready';

export const MatchSetupScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const { canEdit } = useMatchPermissions(match);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<SetupStep>('toss');

  // Team data
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);

  // Toss state
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossChoice, setTossChoice] = useState<'bat' | 'field'>('bat');

  // Playing 11 state
  const [team1Selected, setTeam1Selected] = useState<Set<string>>(new Set());
  const [team2Selected, setTeam2Selected] = useState<Set<string>>(new Set());

  // Captains state
  const [team1Captain, setTeam1Captain] = useState('');
  const [team2Captain, setTeam2Captain] = useState('');

  // Batting order state
  const [team1BattingOrder, setTeam1BattingOrder] = useState<string[]>([]);
  const [team2BattingOrder, setTeam2BattingOrder] = useState<string[]>([]);

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      // Load players for both teams
      const team1 = await teamsApi.getTeamPlayers(matchData.teamAId || '');
      const team2 = await teamsApi.getTeamPlayers(matchData.teamBId || '');

      setTeam1Players(team1);
      setTeam2Players(team2);

      // Initialize toss winner as team1
      setTossWinnerId(matchData.teamAId || '');

      // Determine which step to show based on completed steps
      let nextStep: SetupStep = 'toss';

      if (matchData.tossWinnerId) {
        setTossWinnerId(matchData.tossWinnerId);
        setTossChoice(matchData.tossChoice || 'bat');
        nextStep = 'playing11';

        // If playing 11 is selected, move to captains
        if (matchData.teamAPlaying11 && matchData.teamBPlaying11) {
          setTeam1Selected(new Set(matchData.teamAPlaying11));
          setTeam2Selected(new Set(matchData.teamBPlaying11));
          nextStep = 'captains';

          // If captains are designated, move to batting order
          if (matchData.teamACaptainId && matchData.teamBCaptainId) {
            setTeam1Captain(matchData.teamACaptainId);
            setTeam2Captain(matchData.teamBCaptainId);
            nextStep = 'batting-order';

            // If batting order is set, move to ready
            if (matchData.teamABattingOrder && matchData.teamBBattingOrder) {
              setTeam1BattingOrder(matchData.teamABattingOrder);
              setTeam2BattingOrder(matchData.teamBBattingOrder);
              nextStep = 'ready';
            } else {
              // Set default batting order from playing 11
              setTeam1BattingOrder(matchData.teamAPlaying11);
              setTeam2BattingOrder(matchData.teamBPlaying11);
            }
          }
        }
      }

      setCurrentStep(nextStep);
    } catch (error) {
      console.error('Error loading match data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTossSubmit = async () => {
    if (!tossWinnerId) {
      Alert.alert('Error', 'Please select toss winner');
      return;
    }

    try {
      let updatedMatch;
      // Record or update toss
      if (!match?.tossWinnerId) {
        const response = await matchesApi.recordToss(matchId, tossWinnerId, tossChoice);
        updatedMatch = response;
        Alert.alert('Success', 'Toss recorded');
      } else {
        // Update existing toss
        const response = await matchesApi.updateToss(matchId, tossWinnerId, tossChoice);
        updatedMatch = response;
        Alert.alert('Success', 'Toss updated');
      }

      // Update local match state to reflect changes
      if (updatedMatch) {
        setMatch(prev => ({
          ...prev!,
          ...updatedMatch,
          // Preserve nested objects that might be missing in the update response
          teamA: prev?.teamA,
          teamB: prev?.teamB,
          tossWinner: (prev?.tossWinnerId === updatedMatch.tossWinnerId) ? prev?.tossWinner : undefined
        }));
      }

      setCurrentStep('playing11');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record toss');
    }
  };

  const togglePlayer = (playerId: string, team: 'team1' | 'team2') => {
    if (team === 'team1') {
      const newSet = new Set(team1Selected);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        if (newSet.size >= 11) {
          Alert.alert('Limit', 'Maximum 11 players allowed');
          return;
        }
        newSet.add(playerId);
      }
      setTeam1Selected(newSet);
    } else {
      const newSet = new Set(team2Selected);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        if (newSet.size >= 11) {
          Alert.alert('Limit', 'Maximum 11 players allowed');
          return;
        }
        newSet.add(playerId);
      }
      setTeam2Selected(newSet);
    }
  };

  const handlePlaying11Submit = async () => {
    if (team1Selected.size !== 11 || team2Selected.size !== 11) {
      Alert.alert('Error', 'Please select exactly 11 players for each team');
      return;
    }

    try {
      // Check if playing 11 is already selected
      const team1Playing11 = match?.teamAPlaying11;
      const team2Playing11 = match?.teamBPlaying11;

      // Select or update team A playing 11
      if (team1Playing11) {
        await matchesApi.updatePlaying11(matchId, match!.teamAId || '', Array.from(team1Selected));
      } else {
        await matchesApi.selectPlaying11(matchId, match!.teamAId || '', Array.from(team1Selected));
      }

      // Select or update team B playing 11
      if (team2Playing11) {
        await matchesApi.updatePlaying11(matchId, match!.teamBId || '', Array.from(team2Selected));
      } else {
        await matchesApi.selectPlaying11(matchId, match!.teamBId || '', Array.from(team2Selected));
      }

      Alert.alert('Success', team1Playing11 || team2Playing11 ? 'Playing 11 updated' : 'Playing 11 selected');
      setCurrentStep('captains');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to select playing 11');
    }
  };

  const handleCaptainsSubmit = async () => {
    if (!team1Captain || !team2Captain) {
      Alert.alert('Error', 'Please select captain for both teams');
      return;
    }

    try {
      await matchesApi.designateCaptain(matchId, match!.teamAId || '', team1Captain);
      await matchesApi.designateCaptain(matchId, match!.teamBId || '', team2Captain);
      Alert.alert('Success', 'Captains designated');

      // Set batting order to selected players
      setTeam1BattingOrder(Array.from(team1Selected));
      setTeam2BattingOrder(Array.from(team2Selected));
      setCurrentStep('batting-order');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to designate captains');
    }
  };

  const movePlayerUp = (index: number, team: 'team1' | 'team2') => {
    if (index === 0) return; // Can't move first player up

    if (team === 'team1') {
      const newOrder = [...team1BattingOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setTeam1BattingOrder(newOrder);
    } else {
      const newOrder = [...team2BattingOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setTeam2BattingOrder(newOrder);
    }
  };

  const movePlayerDown = (index: number, team: 'team1' | 'team2') => {
    if (team === 'team1') {
      if (index === team1BattingOrder.length - 1) return; // Can't move last player down
      const newOrder = [...team1BattingOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setTeam1BattingOrder(newOrder);
    } else {
      if (index === team2BattingOrder.length - 1) return; // Can't move last player down
      const newOrder = [...team2BattingOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setTeam2BattingOrder(newOrder);
    }
  };

  const handleBattingOrderSubmit = async () => {
    if (team1BattingOrder.length === 0 || team2BattingOrder.length === 0) {
      Alert.alert('Error', 'Please set batting order for both teams');
      return;
    }

    try {
      await matchesApi.setBattingOrder(matchId, match!.teamAId || '', team1BattingOrder);
      await matchesApi.setBattingOrder(matchId, match!.teamBId || '', team2BattingOrder);
      Alert.alert('Success', 'Batting order set');
      setCurrentStep('ready');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to set batting order');
    }
  };

  const handleStartMatch = async () => {
    try {
      // Navigate to SelectBatsmen screen to choose opening batsmen and bowler
      navigation.navigate('SelectBatsmen', { matchId });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start match');
    }
  };

  const handleUndoMatch = () => {
    Alert.alert(
      'Undo Match',
      'Are you sure you want to undo this match? It will be abandoned.',
      [
        { text: 'Cancel', onPress: () => { } },
        {
          text: 'Undo',
          onPress: async () => {
            try {
              await matchesApi.abandonMatch(matchId);
              Alert.alert('Success', 'Match abandoned');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to undo match');
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

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Match not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, currentStep === 'toss' && styles.progressStepActive]}>
          <Text style={styles.progressText}>1. Toss</Text>
        </View>
        <View style={[styles.progressStep, currentStep === 'playing11' && styles.progressStepActive]}>
          <Text style={styles.progressText}>2. Playing 11</Text>
        </View>
        <View style={[styles.progressStep, currentStep === 'captains' && styles.progressStepActive]}>
          <Text style={styles.progressText}>3. Captains</Text>
        </View>
        <View style={[styles.progressStep, currentStep === 'batting-order' && styles.progressStepActive]}>
          <Text style={styles.progressText}>4. Batting Order</Text>
        </View>
        <View style={[styles.progressStep, currentStep === 'ready' && styles.progressStepActive]}>
          <Text style={styles.progressText}>5. Ready</Text>
        </View>
      </View>

      {!canEdit && (
        <View style={styles.viewOnlyBanner}>
          <Text style={styles.viewOnlyText}>You are in VIEW ONLY mode. Only the match creator or scorer can edit.</Text>
        </View>
      )}

      {/* Step 1: Toss */}
      {currentStep === 'toss' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Record Toss</Text>

          {match?.tossWinnerId && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ Toss already recorded (click below to edit)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.infoText}>Toss Won By: </Text>
                <TeamLogo
                  team={match.tossWinnerId === match.teamAId ? match.teamA : match.teamB}
                  size={20}
                  style={{ marginHorizontal: 6 }}
                />
                <Text style={styles.infoText}>
                  {match.tossWinnerId === match.teamAId ? match.teamA?.name : match.teamB?.name}
                </Text>
              </View>
              <Text style={styles.infoText}>Current Choice: {match.tossChoice}</Text>
            </View>
          )}

          <Text style={styles.label}>Toss Winner</Text>
          <View style={styles.pickerContainer}>
            <PickerSelect
              selectedValue={tossWinnerId}
              onValueChange={setTossWinnerId}
              items={[
                { label: 'Select Team', value: '' },
                { label: match.teamA?.name || 'Team A', value: match.teamAId || '' },
                { label: match.teamB?.name || 'Team B', value: match.teamBId || '' },
              ]}
            />
          </View>

          <Text style={styles.label}>Toss Choice</Text>
          <View style={styles.choiceButtons}>
            <TouchableOpacity
              style={[styles.choiceButton, tossChoice === 'bat' && styles.choiceButtonActive]}
              onPress={() => setTossChoice('bat')}
            >
              <Text style={[styles.choiceButtonText, tossChoice === 'bat' && styles.choiceButtonTextActive]}>
                Bat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceButton, tossChoice === 'field' && styles.choiceButtonActive]}
              onPress={() => setTossChoice('field')}
            >
              <Text style={[styles.choiceButtonText, tossChoice === 'field' && styles.choiceButtonTextActive]}>
                Field
              </Text>
            </TouchableOpacity>
          </View>

          {canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={handleTossSubmit}>
              <Text style={styles.nextButtonText}>Next: Select Playing 11</Text>
            </TouchableOpacity>
          )}

          {!canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep('playing11')}>
              <Text style={styles.nextButtonText}>Next: View Playing 11</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 2: Playing 11 */}
      {currentStep === 'playing11' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Select Playing 11</Text>

          {match?.teamAPlaying11 && match?.teamBPlaying11 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ Playing 11 already selected (click below to edit)</Text>
            </View>
          )}

          <View style={styles.teamsContainer}>
            {/* Team 1 */}
            <View style={styles.teamSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TeamLogo team={match.teamA} size={24} style={{ marginRight: 8 }} />
                <Text style={[styles.teamName, { marginBottom: 0 }]}>{match.teamA?.name || 'Team A'} ({team1Selected.size}/11)</Text>
              </View>
              <FlatList
                data={team1Players}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.playerItem,
                      team1Selected.has(item.id) && styles.playerItemSelected,
                    ]}
                    onPress={() => togglePlayer(item.id, 'team1')}
                  >
                    <Text style={styles.playerName}>{item.name}</Text>
                    <Text style={styles.playerNumber}>#{item.jerseyNumber}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Team 2 */}
            <View style={styles.teamSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TeamLogo team={match.teamB} size={24} style={{ marginRight: 8 }} />
                <Text style={[styles.teamName, { marginBottom: 0 }]}>{match.teamB?.name || 'Team B'} ({team2Selected.size}/11)</Text>
              </View>
              <FlatList
                data={team2Players}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.playerItem,
                      team2Selected.has(item.id) && styles.playerItemSelected,
                    ]}
                    onPress={() => togglePlayer(item.id, 'team2')}
                  >
                    <Text style={styles.playerName}>{item.name}</Text>
                    <Text style={styles.playerNumber}>#{item.jerseyNumber}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>

          {canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={handlePlaying11Submit}>
              <Text style={styles.nextButtonText}>Next: Select Captains</Text>
            </TouchableOpacity>
          )}

          {!canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep('captains')}>
              <Text style={styles.nextButtonText}>Next: View Captains</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('toss')}>
            <Text style={styles.backButtonText}>← Back to Toss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Captains */}
      {currentStep === 'captains' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Designate Captains</Text>

          {match?.teamACaptainId && match?.teamBCaptainId && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ Captains already designated (click below to edit)</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TeamLogo team={match.teamA} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.label, { marginBottom: 0 }]}>{match.teamA?.name || 'Team A'} Captain</Text>
          </View>
          <View style={styles.pickerContainer}>
            <PickerSelect
              selectedValue={team1Captain}
              onValueChange={setTeam1Captain}
              items={[
                { label: 'Select Captain', value: '' },
                ...Array.from(team1Selected).map((playerId) => {
                  const player = team1Players.find((p) => p.id === playerId);
                  return { label: player?.name || '', value: playerId };
                }),
              ]}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TeamLogo team={match.teamB} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.label, { marginBottom: 0 }]}>{match.teamB?.name || 'Team B'} Captain</Text>
          </View>
          <View style={styles.pickerContainer}>
            <PickerSelect
              selectedValue={team2Captain}
              onValueChange={setTeam2Captain}
              items={[
                { label: 'Select Captain', value: '' },
                ...Array.from(team2Selected).map((playerId) => {
                  const player = team2Players.find((p) => p.id === playerId);
                  return { label: player?.name || '', value: playerId };
                }),
              ]}
            />
          </View>

          {canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={handleCaptainsSubmit}>
              <Text style={styles.nextButtonText}>Next: Set Batting Order</Text>
            </TouchableOpacity>
          )}

          {!canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep('batting-order')}>
              <Text style={styles.nextButtonText}>Next: View Batting Order</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('playing11')}>
            <Text style={styles.backButtonText}>← Back to Playing 11</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 4: Batting Order */}
      {currentStep === 'batting-order' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 4: Set Batting Order</Text>

          {match?.teamABattingOrder && match?.teamBBattingOrder && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>✓ Batting order already set (use ↑ and ↓ buttons to edit)</Text>
            </View>
          )}

          <Text style={styles.infoText}>Use ↑ and ↓ buttons to reorder players</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TeamLogo team={match.teamA} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.label, { marginBottom: 0 }]}>{match.teamA?.name || 'Team A'} Batting Order</Text>
          </View>
          <FlatList
            data={team1BattingOrder}
            keyExtractor={(item) => item}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const player = team1Players.find((p) => p.id === item);
              return (
                <View style={styles.battingOrderItemWithButtons}>
                  <Text style={styles.battingOrderNumber}>{index + 1}</Text>
                  <Text style={styles.battingOrderName}>{player?.name}</Text>
                  <View style={styles.battingOrderButtons}>
                    <TouchableOpacity
                      style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                      onPress={() => movePlayerUp(index, 'team1')}
                      disabled={index === 0}
                    >
                      <Text style={styles.moveButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.moveButton, index === team1BattingOrder.length - 1 && styles.moveButtonDisabled]}
                      onPress={() => movePlayerDown(index, 'team1')}
                      disabled={index === team1BattingOrder.length - 1}
                    >
                      <Text style={styles.moveButtonText}>↓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 16 }}>
            <TeamLogo team={match.teamB} size={20} style={{ marginRight: 8 }} />
            <Text style={[styles.label, { marginBottom: 0 }]}>{match.teamB?.name || 'Team B'} Batting Order</Text>
          </View>
          <FlatList
            data={team2BattingOrder}
            keyExtractor={(item) => item}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const player = team2Players.find((p) => p.id === item);
              return (
                <View style={styles.battingOrderItemWithButtons}>
                  <Text style={styles.battingOrderNumber}>{index + 1}</Text>
                  <Text style={styles.battingOrderName}>{player?.name}</Text>
                  <View style={styles.battingOrderButtons}>
                    <TouchableOpacity
                      style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                      onPress={() => movePlayerUp(index, 'team2')}
                      disabled={index === 0}
                    >
                      <Text style={styles.moveButtonText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.moveButton, index === team2BattingOrder.length - 1 && styles.moveButtonDisabled]}
                      onPress={() => movePlayerDown(index, 'team2')}
                      disabled={index === team2BattingOrder.length - 1}
                    >
                      <Text style={styles.moveButtonText}>↓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          {canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={handleBattingOrderSubmit}>
              <Text style={styles.nextButtonText}>Next: Start Match</Text>
            </TouchableOpacity>
          )}

          {!canEdit && (
            <TouchableOpacity style={styles.nextButton} onPress={() => setCurrentStep('ready')}>
              <Text style={styles.nextButtonText}>Next: Ready</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('captains')}>
            <Text style={styles.backButtonText}>← Back to Captains</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 5: Ready */}
      {currentStep === 'ready' && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>✅ Match Setup Complete!</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Match Summary</Text>
            <Text style={styles.summaryText}>Match: {match.name}</Text>
            <Text style={styles.summaryText}>Type: {match.matchType}</Text>
            <Text style={styles.summaryText}>Overs: {match.overs}</Text>
            <Text style={styles.summaryText}>Venue: {match.venue}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.summaryText}>Team A: </Text>
              <TeamLogo team={match.teamA} size={20} style={{ marginRight: 6 }} />
              <Text style={styles.summaryText}>{match.teamA?.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.summaryText}>Team B: </Text>
              <TeamLogo team={match.teamB} size={20} style={{ marginRight: 6 }} />
              <Text style={styles.summaryText}>{match.teamB?.name}</Text>
            </View>
          </View>

          {canEdit && (
            <>
              <TouchableOpacity style={styles.startButton} onPress={handleStartMatch}>
                <Text style={styles.startButtonText}>🎯 Start Match & Begin Scoring</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.undoButton} onPress={handleUndoMatch}>
                <Text style={styles.undoButtonText}>↶ Undo Match</Text>
              </TouchableOpacity>
            </>
          )}

          {!canEdit && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Waiting for match to prevent...</Text>
            </View>
          )}
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
    color: '#999',
  },
  viewOnlyBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEEBA',
    alignItems: 'center',
  },
  viewOnlyText: {
    color: '#856404',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  progressStep: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
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
    marginBottom: 16,
  },
  choiceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  choiceButtonActive: {
    backgroundColor: '#007AFF',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  choiceButtonTextActive: {
    color: '#fff',
  },
  teamsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  playerItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  playerNumber: {
    fontSize: 12,
    color: '#666',
  },
  battingOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  battingOrderItemWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  battingOrderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  moveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  moveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  moveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  battingOrderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 12,
    minWidth: 30,
  },
  battingOrderName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#999',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  undoButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
});
