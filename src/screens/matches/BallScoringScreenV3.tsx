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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, Player, Ball } from '../../types';
import { calculateMatchState, MatchState, BallRecord } from '../../utils/cricketRulesEngine';

export const BallScoringScreenV3: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const params = route.params || {};
  const matchId: string = params.matchId;
  const batsman1Id: string = params.batsman1Id || '';
  const batsman2Id: string = params.batsman2Id || '';
  const initialBowler: string = params.bowlerId || '';
  const [match, setMatch] = useState<Match | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [liveScore, setLiveScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Players
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [battingTeamId, setBattingTeamId] = useState('');
  const [fieldingTeamId, setFieldingTeamId] = useState('');

  // Current match state
  const [currentOver, setCurrentOver] = useState(1);
  const [currentBall, setCurrentBall] = useState(1);
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  // Ball details
  const [runs, setRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState('');
  const [extraType, setExtraType] = useState('none');
  const [extraRuns, setExtraRuns] = useState(0);

  // Modal state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [modalType, setModalType] = useState<'striker' | 'non-striker' | 'bowler'>('striker');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  
  // Second innings setup
  const [showSecondInningsSetup, setShowSecondInningsSetup] = useState(false);
  const [secondInningsStriker, setSecondInningsStriker] = useState('');
  const [secondInningsNonStriker, setSecondInningsNonStriker] = useState('');
  const [secondInningsBowler, setSecondInningsBowler] = useState('');

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      // Determine batting and fielding teams based on current innings
      let batting: string | undefined;
      let fielding: string | undefined;
      
      if (matchData.currentInnings === 2) {
        // Second innings - teams are swapped
        const firstInningsBatting = matchData.tossChoice === 'bat' ? matchData.teamAId : matchData.teamBId;
        batting = firstInningsBatting === matchData.teamAId ? matchData.teamBId : matchData.teamAId;
        fielding = firstInningsBatting;
      } else {
        // First innings - use toss choice
        batting = matchData.tossChoice === 'bat' ? matchData.teamAId : matchData.teamBId;
        fielding = batting === matchData.teamAId ? matchData.teamBId : matchData.teamAId;
      }
      
      setBattingTeamId(batting || '');
      setFieldingTeamId(fielding || '');

      // Load all players
      const teamAPlayers = matchData.teamAId ? await teamsApi.getTeamPlayers(matchData.teamAId) : [];
      const teamBPlayers = matchData.teamBId ? await teamsApi.getTeamPlayers(matchData.teamBId) : [];
      const allPlayersData = [...teamAPlayers, ...teamBPlayers];
      setAllPlayers(allPlayersData);

      // Load balls to get last striker/bowler
      const ballsData = await matchesApi.getBalls(matchId);
      const ballsArray = (Array.isArray(ballsData) ? ballsData : [])
  .filter(b => b.inningsNumber === matchData.currentInnings);

      // ALWAYS use rules engine if balls exist (even if params are set)
      // This ensures undo recalculates correctly
      if (ballsArray.length > 0) {
        console.log('📊 Calculating strike position using rules engine...');
        console.log(`📍 Total balls to replay: ${ballsArray.length}`);
        
        // Convert balls to BallRecord format
        const ballRecords: BallRecord[] = ballsArray.map(b => ({
          batsmanId: b.batsmanId,
          bowlerId: b.bowlerId,
          runs: b.runs,
          extraRuns: b.extraRuns,
          extras: b.extras,
          isWicket: b.isWicket,
          wicketType: b.wicketType as any,
        }));

        // Calculate state using rules engine
        const battingOrder =
          batting === matchData.teamAId
            ? matchData.teamABattingOrder
            : matchData.teamBBattingOrder;

        const initialState: MatchState = {
          striker: battingOrder?.[0] || '',
          nonStriker: battingOrder?.[1] || '',
          bowler: ballsArray[0]?.bowlerId || '',
          over: 1,
          ballInOver: 1,
          legalBallsInOver: 0,
        };

        const finalState = calculateMatchState(ballRecords, initialState, getNextBatsman);

        setStriker(finalState.striker);
        setNonStriker(finalState.nonStriker);
        setBowler(finalState.bowler);
        setCurrentOver(finalState.over);
        setCurrentBall(finalState.ballInOver);

        console.log('✅ Strike position calculated:', {
          striker: allPlayersData.find(p => p.id === finalState.striker)?.name,
          nonStriker: allPlayersData.find(p => p.id === finalState.nonStriker)?.name,
          bowler: allPlayersData.find(p => p.id === finalState.bowler)?.name,
        });
      } else {
        // No balls yet - use params if available, otherwise fallback to batting order
        if (batsman1Id && batsman2Id && initialBowler) {
          setStriker(batsman1Id);
          setNonStriker(batsman2Id);
          setBowler(initialBowler);
          console.log('✅ CURRENT PLAYERS (from params):', {
            striker: allPlayersData.find(p => p.id === batsman1Id)?.name || batsman1Id,
            nonStriker: allPlayersData.find(p => p.id === batsman2Id)?.name || batsman2Id,
            bowler: allPlayersData.find(p => p.id === initialBowler)?.name || initialBowler,
          });
        } else {
          // Fallback to batting order
          const battingOrder = batting === matchData.teamAId 
            ? matchData.teamABattingOrder 
            : matchData.teamBBattingOrder;
          
          if (battingOrder && battingOrder.length >= 2) {
            setStriker(battingOrder[0]);
            setNonStriker(battingOrder[1]);
          }

          const fieldingPlayers = fielding === matchData.teamAId ? teamAPlayers : teamBPlayers;
          if (fieldingPlayers.length > 0) {
            setBowler(fieldingPlayers[0].id);
          }
        }
      }

      await loadBallsAndScore();
      
      // Check if this is the start of second innings
      if (matchData.currentInnings === 2) {
        const ballsData = await matchesApi.getBalls(matchId);
        const ballsArray = Array.isArray(ballsData) ? ballsData : [];
        
        // Filter balls for current innings (second innings)
        const currentInningsBalls = ballsArray.filter(b => b.inningsNumber === 2);
        
        // If no balls recorded yet for second innings, show setup modal
        if (currentInningsBalls.length === 0) {
          console.log('🎯 Second innings starting - showing setup modal');
          setShowSecondInningsSetup(true);
        } else {
          console.log('✅ Second innings already in progress - no setup modal needed');
        }
      }
    } catch (error) {
      console.error('❌ Error loading match data:', error);
      Alert.alert('⚠️ Error', 'Failed to load match data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBallsAndScore = async () => {
    try {
      const ballsData = await matchesApi.getBalls(matchId);
      const ballsArray = Array.isArray(ballsData) ? ballsData : [];

      // Filter balls for current innings only
      const currentInnings = match?.currentInnings || 1;
      const currentInningsBalls = ballsArray.filter(b => b.inningsNumber === currentInnings);
      
      setBalls(currentInningsBalls);

      const scoreData = await matchesApi.getLiveScore(matchId);
      setLiveScore(scoreData);

      // Auto-update over and ball number based on current innings balls
      if (currentInningsBalls.length > 0) {
        const lastBall = currentInningsBalls[currentInningsBalls.length - 1];
        console.log('📊 Last ball recorded:', { over: lastBall.over, ballNumber: lastBall.ballNumber });
        
        if (lastBall.ballNumber === 6) {
          // Over complete, next is over+1, ball 1
          setCurrentOver(lastBall.over + 1);
          setCurrentBall(1);
          console.log('✅ Over complete. Next: Over', lastBall.over + 1, 'Ball 1');
        } else {
          // Same over, next ball
          setCurrentOver(lastBall.over);
          setCurrentBall(lastBall.ballNumber + 1);
          console.log('✅ Next: Over', lastBall.over, 'Ball', lastBall.ballNumber + 1);
        }
      } else {
        // No balls yet
        setCurrentOver(1);
        setCurrentBall(1);
        console.log('✅ First ball: Over 1, Ball 1');
      }
    } catch (error) {
      console.error('Error loading balls:', error);
    }
  };

  // Calculate next striker based on runs
  

  // TODO: Pass ballRecords into getNextBatsman instead of using React state
  // Get next batsman from batting order
  const getNextBatsman = () => {
    if (!match) return null;
    
    const battingOrder = battingTeamId === match.teamAId 
      ? match.teamABattingOrder 
      : match.teamBBattingOrder;
    
    if (!battingOrder) return null;

    // Find batsmen who are already out
    const outBatsmen = balls
      .filter(b => b.isWicket)
      .map(b => b.batsmanId);

    // Find next batsman not yet out
    for (const playerId of battingOrder) {
      if (!outBatsmen.includes(playerId) && playerId !== striker && playerId !== nonStriker) {
        return playerId;
      }
    }
    return null;
  };
const handleRecordBall = async () => {
  if (!striker || !nonStriker || !bowler) {
    Alert.alert('Error', 'Please select striker, non-striker, and bowler');
    return;
  }

  const ballData = {
    over: currentOver,
    ballNumber: currentBall,
    batsmanId: striker,
    nonStrikerId: nonStriker,
    bowlerId: bowler,
    runs,
    extras: extraType,
    extraRuns,
    isWicket,
    wicketType: isWicket ? wicketType : undefined,
  };

  try {
    await matchesApi.recordBall(matchId, ballData);

    // Reset input only
    setRuns(0);
    setIsWicket(false);
    setWicketType('');
    setExtraType('none');
    setExtraRuns(0);

    // 🔁 SINGLE SOURCE OF TRUTH
    await loadMatchData();
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to record ball');
  }
};


  const handleChangeStriker = () => {
    // Get out batsmen
    const outBatsmen = balls
      .filter(b => b.isWicket)
      .map(b => b.batsmanId);

    // Get available batsmen from batting team only
    const battingTeamPlayers = allPlayers.filter(p => p.id === battingTeamId || 
      (match?.teamAId === battingTeamId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id))
    );

    const available = battingTeamPlayers.filter(p => 
      p.id !== bowler && 
      p.id !== nonStriker && 
      !outBatsmen.includes(p.id)
    );

    setAvailablePlayers(available);
    setModalType('striker');
    setShowPlayerModal(true);
  };

  const handleChangeNonStriker = () => {
    // Get out batsmen
    const outBatsmen = balls
      .filter(b => b.isWicket)
      .map(b => b.batsmanId);

    // Get available batsmen from batting team only
    const battingTeamPlayers = allPlayers.filter(p => p.id === battingTeamId || 
      (match?.teamAId === battingTeamId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id))
    );

    const available = battingTeamPlayers.filter(p => 
      p.id !== bowler && 
      p.id !== striker && 
      !outBatsmen.includes(p.id)
    );

    setAvailablePlayers(available);
    setModalType('non-striker');
    setShowPlayerModal(true);
  };

  const handleChangeBowler = () => {
    // Get available bowlers from fielding team only
    const fieldingTeamPlayers = allPlayers.filter(p =>
      (match?.teamAId === fieldingTeamId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id))
    );

    const available = fieldingTeamPlayers.filter(p => 
      p.id !== striker && 
      p.id !== nonStriker
    );

    setAvailablePlayers(available);
    setModalType('bowler');
    setShowPlayerModal(true);
  };

  const handleSelectPlayer = (playerId: string) => {
    // If second innings setup modal is open, update second innings variables
    if (showSecondInningsSetup) {
      if (modalType === 'striker') {
        setSecondInningsStriker(playerId);
      } else if (modalType === 'non-striker') {
        setSecondInningsNonStriker(playerId);
      } else {
        setSecondInningsBowler(playerId);
      }
    } else {
      // Otherwise update regular variables
      if (modalType === 'striker') {
        setStriker(playerId);
      } else if (modalType === 'non-striker') {
        setNonStriker(playerId);
      } else {
        setBowler(playerId);
      }
    }
    setShowPlayerModal(false);
  };

  const handleCompleteInnings = async () => {
    Alert.alert(
      'Complete Innings?',
      'Are you sure you want to complete this innings and start the next one?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const result = await matchesApi.completeInnings(matchId) as any;
              Alert.alert(
                'Innings Completed',
                `First innings: ${result.firstInningsTotal} runs\nTarget: ${result.target}`,
                [{ 
                  text: 'OK', 
                  onPress: async () => {
                    await loadMatchData();
                    await loadBallsAndScore();
                  }
                }]
              );
            } catch (error: any) {
              let errorMessage = 'Failed to complete innings';
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }
              Alert.alert('Error', errorMessage);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleUndoLastBall = () => {
    if (balls.length === 0) {
      Alert.alert('Error', 'No balls to undo');
      return;
    }

    const lastBall = balls[balls.length - 1];
    const lastBallInfo = `Over ${lastBall.over}.${lastBall.ballNumber} - ${allPlayers.find(p => p.id === lastBall.batsmanId)?.name || 'Unknown'} (${lastBall.runs} runs)`;

    Alert.alert(
      'Undo Last Ball?',
      `Delete: ${lastBallInfo}`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Undo',
          onPress: async () => {
            try {
              const response = await matchesApi.undoLastBall(matchId) as any;
              Alert.alert('Success', 'Ball deleted');
              
              // Check if second innings edge case: if only ball was undone, show setup again
              if (response?.shouldShowSecondInningsSetup) {
                console.log('🎯 Second innings edge case detected: showing setup modal again');
                setShowSecondInningsSetup(true);
              }
              
              // Call loadMatchData to fully recalculate striker position by replaying all remaining balls
              await loadMatchData();
            } catch (error: any) {
              let errorMessage = 'Failed to delete ball';
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }
              Alert.alert('Error', errorMessage);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleConfirmSecondInningsSetup = () => {
    if (!secondInningsStriker || !secondInningsNonStriker || !secondInningsBowler) {
      Alert.alert('Error', 'Please select striker, non-striker, and bowler');
      return;
    }
    
    // Set the players for second innings
    setStriker(secondInningsStriker);
    setNonStriker(secondInningsNonStriker);
    setBowler(secondInningsBowler);
    
    // Close the modal
    setShowSecondInningsSetup(false);
    
    console.log('✅ Second innings setup confirmed:', {
      striker: allPlayers.find(p => p.id === secondInningsStriker)?.name,
      nonStriker: allPlayers.find(p => p.id === secondInningsNonStriker)?.name,
      bowler: allPlayers.find(p => p.id === secondInningsBowler)?.name,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const strikerName = allPlayers.find(p => p.id === striker)?.name || 'Select';
  const nonStrikerName = allPlayers.find(p => p.id === nonStriker)?.name || 'Select';
  const bowlerName = allPlayers.find(p => p.id === bowler)?.name || 'Select';

  return (
    <ScrollView style={styles.container}>
      {/* Current Players Section */}
      <View style={styles.playersCard}>
        <Text style={styles.cardTitle}>Current Players</Text>

        {/* Striker */}
        <View style={styles.playerBox}>
          <Text style={styles.playerLabel}>⚡ Striker (On Strike)</Text>
          <Text style={styles.playerName}>{strikerName}</Text>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangeStriker}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Non-Striker */}
        <View style={styles.playerBox}>
          <Text style={styles.playerLabel}>Non-Striker</Text>
          <Text style={styles.playerName}>{nonStrikerName}</Text>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangeNonStriker}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Bowler */}
        <View style={styles.playerBox}>
          <Text style={styles.playerLabel}>🎯 Bowler</Text>
          <Text style={styles.playerName}>{bowlerName}</Text>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangeBowler}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Score */}
      {liveScore && (
        <View style={styles.scoreCard}>
          <Text style={styles.cardTitle}>Live Score</Text>
          <View style={styles.scoreRow}>
            <View>
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

      {/* Second Innings Info */}
      {match?.currentInnings === 2 && (
        <View style={styles.inningsInfoCard}>
          <Text style={styles.cardTitle}>Second Innings Info</Text>
          
          {/* First Innings Summary */}
          <View style={styles.inningsRow}>
            <View style={styles.inningsColumn}>
              <Text style={styles.inningsLabel}>First Innings</Text>
              <Text style={styles.inningsValue}>
                {match.firstInningsRuns}/{match.firstInningsWickets}
              </Text>
              <Text style={styles.inningsOvers}>{match.firstInningsOvers}</Text>
            </View>
          </View>

          {/* Target */}
          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>Target:</Text>
            <Text style={styles.targetValue}>{match.target} runs</Text>
          </View>

          {/* Required Run Rate */}
          {liveScore?.requiredRunRate && (
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Required RR:</Text>
              <Text style={styles.targetValue}>{liveScore.requiredRunRate}</Text>
            </View>
          )}

          {/* Runs Needed */}
          {match.target && liveScore?.battingTeam?.runs !== undefined && (
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>Runs Needed:</Text>
              <Text style={styles.targetValue}>
                {Math.max(0, (match.target || 0) - (liveScore.battingTeam?.runs || 0))}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Current Ball Info */}
      <View style={styles.ballInfoCard}>
        <Text style={styles.ballInfoTitle}>Current Ball</Text>
        <Text style={styles.ballInfoValue}>Over {currentOver} • Ball {currentBall}</Text>
      </View>

      {/* Ball Details Form */}
      <View style={styles.card}>
        <Text style={styles.title}>Record Ball</Text>

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

        {/* Complete Innings Button */}
        <TouchableOpacity style={styles.completeInningsButton} onPress={handleCompleteInnings}>
          <Text style={styles.completeInningsButtonText}>Complete Innings</Text>
        </TouchableOpacity>

        {/* Undo Last Ball Button */}
        {balls.length > 0 && (
          <TouchableOpacity style={styles.undoButton} onPress={handleUndoLastBall}>
            <Text style={styles.undoButtonText}>↶ Undo Last Ball</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Previous Balls */}
      {balls.length > 0 && (
        <View style={styles.ballsCard}>
          <Text style={styles.ballsTitle}>Last 10 Balls</Text>
          <FlatList
            data={balls.slice(-10).reverse()}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ballItem}>
                <View style={styles.ballItemHeader}>
                  
                 <Text style={styles.ballItemOver}>Over {item.over}.{item.ballNumber}</Text>
   <View style={styles.ballItemRunsContainer}>
                    <Text style={styles.ballItemRuns}>{item.runs}</Text>
                    {item.extraRuns > 0 && <Text style={styles.ballItemExtra}>+{item.extraRuns}</Text>}
                  </View>
                </View>
                {item.isWicket && (
                  <Text style={styles.ballItemWicket}>🔴 WICKET - {item.wicketType}</Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.noBallsText}>No balls recorded yet</Text>
            }
          />
        </View>
      )}

      {/* Next Ball Suggestion */}
      <View style={styles.suggestionCard}>
        <Text style={styles.suggestionTitle}>✓ Next Ball Should Be</Text>
        <View style={styles.suggestionContent}>
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Over • Ball:</Text>
            <Text style={styles.suggestionValue}>{currentOver}.{currentBall}</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>⚡ Striker:</Text>
            <Text style={styles.suggestionValue}>{strikerName}</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Non-Striker:</Text>
            <Text style={styles.suggestionValue}>{nonStrikerName}</Text>
          </View>
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>🎯 Bowler:</Text>
            <Text style={styles.suggestionValue}>{bowlerName}</Text>
          </View>
        </View>
        <Text style={styles.suggestionHint}>
          If this doesn't match your expectation, use Undo to correct the previous ball
        </Text>
      </View>

      {/* Undo Preview */}
      {balls.length > 0 && (
        <View style={styles.undoPreviewCard}>
          <Text style={styles.undoPreviewTitle}>↶ If You Undo Last Ball</Text>
          {(() => {
            // Calculate state after undo by replaying all but last ball
            const ballsWithoutLast = balls.slice(0, -1);
            if (ballsWithoutLast.length === 0) {
              return (
                <View style={styles.undoPreviewContent}>
                  <Text style={styles.undoPreviewText}>Match will reset to start</Text>
                  <Text style={styles.undoPreviewHint}>No balls will be recorded</Text>
                </View>
              );
            }

            // Convert to BallRecord format and calculate state
            const ballRecords: BallRecord[] = ballsWithoutLast.map(b => ({
              batsmanId: b.batsmanId,
              bowlerId: b.bowlerId,
              runs: b.runs,
              extraRuns: b.extraRuns,
              extras: b.extras,
              isWicket: b.isWicket,
              wicketType: b.wicketType as any,
            }));

            const battingOrder =
  battingTeamId === match?.teamAId
    ? match?.teamABattingOrder
    : match?.teamBBattingOrder;

const initialState: MatchState = {
  striker: batsman1Id || battingOrder?.[0] || '',
  nonStriker: batsman2Id || battingOrder?.[1] || '',
  bowler: initialBowler || ballsWithoutLast[0]?.bowlerId || '',
  over: 1,
  ballInOver: 1,
  legalBallsInOver: 0,
};


            const undoState = calculateMatchState(ballRecords, initialState, getNextBatsman);

            return (
              <View style={styles.undoPreviewContent}>
                <View style={styles.undoPreviewRow}>
                  <Text style={styles.undoPreviewLabel}>⚡ Striker:</Text>
                  <Text style={styles.undoPreviewValue}>
                    {allPlayers.find(p => p.id === undoState.striker)?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.undoPreviewRow}>
                  <Text style={styles.undoPreviewLabel}>Non-Striker:</Text>
                  <Text style={styles.undoPreviewValue}>
                    {allPlayers.find(p => p.id === undoState.nonStriker)?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.undoPreviewRow}>
                  <Text style={styles.undoPreviewLabel}>🎯 Bowler:</Text>
                  <Text style={styles.undoPreviewValue}>
                    {allPlayers.find(p => p.id === undoState.bowler)?.name || 'N/A'}
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>
      )}

      {/* Player Selection Modal */}
      <Modal
        visible={showPlayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlayerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {modalType === 'striker' ? 'Striker' : modalType === 'non-striker' ? 'Non-Striker' : 'Bowler'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availablePlayers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playerOption}
                  onPress={() => handleSelectPlayer(item.id)}
                >
                  <Text style={styles.playerOptionName}>{item.name}</Text>
                  <Text style={styles.playerOptionNumber}>#{item.role}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No players available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Second Innings Setup Modal */}
      <Modal
        visible={showSecondInningsSetup}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.setupModalOverlay}>
          <View style={styles.setupModalContent}>
            <Text style={styles.setupModalTitle}>Second Innings Setup</Text>
            <Text style={styles.setupModalSubtitle}>Select opening batsmen and bowler</Text>

            {/* Striker Selection */}
            <View style={styles.setupSection}>
              <Text style={styles.setupLabel}>⚡ Striker (On Strike)</Text>
              <TouchableOpacity
                style={styles.setupPlayerButton}
                onPress={() => {
                  const battingTeamPlayers = allPlayers.filter(p =>
                    battingTeamId === match?.teamAId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id)
                  );
                  setAvailablePlayers(battingTeamPlayers);
                  setModalType('striker');
                  setShowPlayerModal(true);
                }}
              >
                <Text style={styles.setupPlayerButtonText}>
                  {secondInningsStriker ? allPlayers.find(p => p.id === secondInningsStriker)?.name : 'Select Striker'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Non-Striker Selection */}
            <View style={styles.setupSection}>
              <Text style={styles.setupLabel}>Non-Striker</Text>
              <TouchableOpacity
                style={styles.setupPlayerButton}
                onPress={() => {
                  const battingTeamPlayers = allPlayers.filter(p =>
                    battingTeamId === match?.teamAId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id)
                  );
                  setAvailablePlayers(battingTeamPlayers);
                  setModalType('non-striker');
                  setShowPlayerModal(true);
                }}
              >
                <Text style={styles.setupPlayerButtonText}>
                  {secondInningsNonStriker ? allPlayers.find(p => p.id === secondInningsNonStriker)?.name : 'Select Non-Striker'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bowler Selection */}
            <View style={styles.setupSection}>
              <Text style={styles.setupLabel}>🎯 Bowler</Text>
              <TouchableOpacity
                style={styles.setupPlayerButton}
                onPress={() => {
                  const fieldingTeamPlayers = allPlayers.filter(p =>
                    fieldingTeamId === match?.teamAId ? match?.teamAPlaying11?.includes(p.id) : match?.teamBPlaying11?.includes(p.id)
                  );
                  setAvailablePlayers(fieldingTeamPlayers);
                  setModalType('bowler');
                  setShowPlayerModal(true);
                }}
              >
                <Text style={styles.setupPlayerButtonText}>
                  {secondInningsBowler ? allPlayers.find(p => p.id === secondInningsBowler)?.name : 'Select Bowler'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.setupConfirmButton}
              onPress={handleConfirmSecondInningsSetup}
            >
              <Text style={styles.setupConfirmButtonText}>Start Second Innings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  playerBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  playerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  changeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  inningsInfoCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inningsColumn: {
    flex: 1,
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
  },
  inningsOvers: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
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
  ballInfoCard: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  ballInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  ballInfoValue: {
    fontSize: 28,
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
  completeInningsButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  completeInningsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 14,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    marginBottom: 8,
    borderRadius: 6,
  },
  ballItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ballItemOver: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  ballItemRuns: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ballItemRunsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ballItemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  ballItemExtra: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  ballItemWicket: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  noBallsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ballText: {
    fontSize: 13,
    color: '#1a1a1a',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  playerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  playerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  playerOptionNumber: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  setupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  setupModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setupModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  setupModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  setupSection: {
    marginBottom: 16,
  },
  setupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  setupPlayerButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  setupPlayerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  setupConfirmButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  setupConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  suggestionCard: {
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
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  suggestionContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  suggestionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  suggestionHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  undoPreviewCard: {
    backgroundColor: '#FCE4EC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#E91E63',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  undoPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C2185B',
    marginBottom: 12,
  },
  undoPreviewContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  undoPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FCE4EC',
  },
  undoPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  undoPreviewValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C2185B',
  },
  undoPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C2185B',
    marginBottom: 8,
  },
  undoPreviewHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
