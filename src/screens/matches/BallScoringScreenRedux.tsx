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
import { Picker } from '@react-native-picker/picker'; // Ensure this package is installed or use standard Picker
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
    fetchMatchData,
    recordBall,
    previewBall,
    clearNextState,
    clearError
} from '../../store/slices/matchSlice';
import { Ball } from '../../types';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { useMatchPermissions } from '../../hooks/useMatchPermissions';

export const BallScoringScreenRedux: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { matchId } = route.params;
    const dispatch = useDispatch<AppDispatch>();

    // Redux State
    const {
        currentState,
        nextState,
        liveScore,
        balls,
        loading,
        recording,
        error
    } = useSelector((state: RootState) => state.match);

    // Local UI State (Form Inputs)
    const [runs, setRuns] = useState(0);
    const [extras, setExtras] = useState<'none' | 'wide' | 'no-ball' | 'bye' | 'leg-bye'>('none');
    const [extraRuns, setExtraRuns] = useState(0);
    const [isWicket, setIsWicket] = useState(false);
    const [wicketType, setWicketType] = useState<string>('');

    // Player Selection State
    const [selectedStriker, setSelectedStriker] = useState<string>('');
    const [selectedNonStriker, setSelectedNonStriker] = useState<string>('');
    const [selectedBowler, setSelectedBowler] = useState<string>('');
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [modalType, setModalType] = useState<'striker' | 'non-striker' | 'bowler'>('striker');
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);

    // Initial Load
    useEffect(() => {
        dispatch(fetchMatchData(matchId));
    }, [dispatch, matchId]);

    // Permissions
    // We need the match object to check permissions. 
    // Ideally fetchMatchData should populate a match object in Redux, but it might be separate.
    // For now, let's look at how we can get the match creator/scorer info.
    // The current match slice doesn't explicitly store the full Match object with createdBy.
    // We might need to fetch it or rely on what we have. 
    // Let's assume we can get it from an API call if not in store, or we can update the slice to store it.
    // For quick implementation, let's fetch match details locally for permission check if not available.
    const [matchDetails, setMatchDetails] = useState<any>(null);
    useEffect(() => {
        const fetchDetails = () => matchesApi.getMatch(matchId).then(setMatchDetails).catch(console.error);
        fetchDetails();
        // Poll for match status updates (important for verifying completion/second innings data)
        const interval = setInterval(fetchDetails, 5000);
        return () => clearInterval(interval);
    }, [matchId, currentState]); // Refresh when state changes (e.g. ball recorded)

    const { canEdit } = useMatchPermissions(matchDetails);

    // Sync Redux State to Local State
    useEffect(() => {
        if (currentState) {
            // Only update if not already set or if it matches the 'expected' flow
            // But to allow overrides, we might want to respect local unless it's empty
            if (!selectedStriker && currentState.striker) setSelectedStriker(currentState.striker.playerId);
            if (!selectedNonStriker && currentState.nonStriker) setSelectedNonStriker(currentState.nonStriker.playerId);
            if (!selectedBowler && currentState.bowler) setSelectedBowler(currentState.bowler.playerId);

            // If the state changes (e.g. new over, wicket), we might want to update
            // For now, simpler approach: Always sync on load, unless we want to persist user changes across renders?
            // Actually, best to sync when currentState changes meaningful values.
            setSelectedStriker(currentState.striker?.playerId || '');
            setSelectedNonStriker(currentState.nonStriker?.playerId || '');
            setSelectedBowler(currentState.bowler?.playerId || '');
        }
    }, [currentState]);

    // Handle Errors
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error, [{ text: 'OK', onPress: () => dispatch(clearError()) }]);
        }
    }, [error, dispatch]);

    const loadAvailablePlayers = async (type: 'striker' | 'non-striker' | 'bowler') => {
        try {
            let teamId = '';

            // Try to get team IDs from liveScore first
            if (liveScore) {
                if (type === 'bowler') {
                    teamId = liveScore.fieldingTeam?.id || '';
                } else {
                    teamId = liveScore.battingTeam?.id || '';
                }
            }

            // Fallback: Use currentState/match data if liveScore not fully ready
            if (!teamId && currentState) {
                // We need to know which team is batting. 
                // Matches API doesn't give full match object here, but we can try to infer or fetch match
                // For now, let's rely on fetching the match details if liveScore is missing
                const matchData = await matchesApi.getMatch(matchId);
                if (matchData) {
                    // Better: API should return teamIds in currentState? No.
                    // Let's rely on fetching match if liveScore is down.
                    const battingTeam = matchData.tossChoice === 'bat' ? (matchData.teamAId || '') : (matchData.teamBId || ''); // Approximate for 1st innings
                    // Correct logic requires checking innings.
                    let battingId = '';
                    let fieldingId = '';

                    if (matchData.currentInnings === 2) {
                        const firstBat = matchData.tossChoice === 'bat' ? (matchData.teamAId || '') : (matchData.teamBId || '');
                        battingId = firstBat === (matchData.teamAId || '') ? (matchData.teamBId || '') : (matchData.teamAId || '');
                        fieldingId = firstBat;
                    } else {
                        battingId = matchData.tossChoice === 'bat' ? (matchData.teamAId || '') : (matchData.teamBId || '');
                        fieldingId = battingId === (matchData.teamAId || '') ? (matchData.teamBId || '') : (matchData.teamAId || '');
                    }

                    teamId = type === 'bowler' ? fieldingId : battingId;
                }
            }

            if (!teamId) {
                Alert.alert('Error', 'Could not determine team. Please wait for data to load.');
                return;
            }

            // We need match data to get playing 11
            const matchData = await matchesApi.getMatch(matchId);
            const players = await teamsApi.getTeamPlayers(teamId);

            // Filter by Playing 11
            const playing11Ids = teamId === matchData.teamAId ? matchData.teamAPlaying11 : matchData.teamBPlaying11;
            const squad = playing11Ids
                ? players.filter((p: any) => playing11Ids.includes(p.id))
                : players;

            // Filter players
            // Get out batsmen
            const outBatsmen = balls
                .filter(b => b.isWicket)
                .map(b => b.batsmanId);

            let available = [];
            if (type === 'bowler') {
                available = squad.filter((p: any) =>
                    p.id !== selectedStriker &&
                    p.id !== selectedNonStriker
                );
            } else {
                available = squad.filter((p: any) =>
                    !outBatsmen.includes(p.id) &&
                    (type === 'striker' ? p.id !== selectedNonStriker : p.id !== selectedStriker)
                );
            }

            setAvailablePlayers(available);
            setModalType(type);
            setShowPlayerModal(true);
        } catch (err) {
            console.error('Failed to load players', err);
            Alert.alert('Error', 'Failed to load players list');
        }
    };

    const handlePlayerSelect = (playerId: string) => {
        if (!playerId) return;
        if (modalType === 'striker') setSelectedStriker(playerId);
        if (modalType === 'non-striker') setSelectedNonStriker(playerId);
        if (modalType === 'bowler') setSelectedBowler(playerId);
        setShowPlayerModal(false);
    };

    const handlePreview = () => {
        if (!currentState) return;

        dispatch(previewBall({
            matchId,
            data: {
                runs,
                extras,
                extraRuns,
                isWicket,
                wicketType: isWicket ? wicketType : undefined,
            }
        }));
    };

    const handleRecord = async () => {
        if (!currentState) {
            Alert.alert('Error', 'Current state not loaded');
            return;
        }

        // Validation
        if (!currentState.currentOver || currentState.currentBall === undefined) {
            Alert.alert('Error', 'Current state incomplete');
            return;
        }
        if (isWicket && !wicketType) {
            Alert.alert('Error', 'Please select wicket type');
            return;
        }
        if (!selectedStriker || !selectedNonStriker || !selectedBowler) {
            Alert.alert('Error', 'Please ensure all players (Striker, Non-Striker, Bowler) are selected.');
            return;
        }
        if (selectedStriker === selectedNonStriker) {
            Alert.alert('Error', 'Striker and Non-Striker cannot be the same person.');
            return;
        }

        const ballData = {
            over: Number(currentState.currentOver),
            ballNumber: Number(currentState.currentBall),
            batsmanId: selectedStriker, // User selected value
            nonStrikerId: selectedNonStriker, // User selected value
            bowlerId: selectedBowler, // User selected value
            runs: Number(runs),
            extras,
            extraRuns: Number(extraRuns),
            isWicket,
            wicketType: isWicket ? wicketType : undefined,
        };

        const resultAction = await dispatch(recordBall({ matchId, data: ballData }));

        if (recordBall.fulfilled.match(resultAction)) {
            const response = resultAction.payload as any;

            if (response && response.status === 'innings_break') {
                Alert.alert('Innings Break', response.message, [
                    { text: 'Start 2nd Innings', onPress: () => dispatch(fetchMatchData(matchId)) }
                ]);
            } else if (response && response.status === 'completed') {
                // Refresh data to show modal
                dispatch(fetchMatchData(matchId));
            } else {
                // Toast or silent success?
                // Alert.alert('Success', 'Ball recorded'); 
            }

            // Reset Form
            setRuns(0);
            setExtras('none');
            setExtraRuns(0);
            setIsWicket(false);
            setWicketType('');
            // Note: fetchMatchData is triggered automatically in thunk success
        }
    };

    // Reset preview when inputs change
    useEffect(() => {
        if (nextState) {
            dispatch(clearNextState());
        }
    }, [runs, extras, extraRuns, isWicket, wicketType, dispatch]);


    if (loading && !currentState) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!currentState && !loading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Failed to load match state</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => dispatch(fetchMatchData(matchId))}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Helper to get name
    const getPlayerName = (id: string, type: 'striker' | 'non-striker' | 'bowler') => {
        if (id === currentState?.striker?.playerId) return currentState.striker.playerName;
        if (id === currentState?.nonStriker?.playerId) return currentState.nonStriker.playerName;
        if (id === currentState?.bowler?.playerId) return currentState.bowler.playerName;

        // If not in current state (e.g. manual selection), usually we'd have the name from the modal list
        // For now, if it matches the ID, we return it, or "Selected Player"
        // Ideally we should store the whole player object or fetch names. 
        // fallback:
        return "Selected Player (" + id.substr(0, 4) + ")";
    };

    return (
        <ScrollView style={styles.container}>
            {/* View Only Banner */}
            {!canEdit && (
                <View style={styles.viewOnlyBanner}>
                    <Text style={styles.viewOnlyText}>LIVE VIEW ONLY - Updates will appear automatically</Text>
                </View>
            )}

            {/* Current State Section */}
            {currentState && (
                <View style={styles.stateCard}>
                    <Text style={styles.cardTitle}>Current State</Text>
                    <View style={styles.stateRow}>
                        {/* Striker */}
                        <View style={styles.playerInfo}>
                            <Text style={styles.label}>Striker</Text>
                            <Text style={styles.playerName}>
                                {currentState.striker.playerId === selectedStriker
                                    ? currentState.striker.playerName
                                    : (selectedStriker ? "Player " + selectedStriker.substr(0, 4) : "Select Player")}
                            </Text>
                            {canEdit && (
                                <TouchableOpacity onPress={() => loadAvailablePlayers('striker')}>
                                    <Text style={styles.changeLink}>Change</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* Non-Striker */}
                        <View style={styles.playerInfo}>
                            <Text style={styles.label}>Non-Striker</Text>
                            <Text style={styles.playerName}>
                                {currentState.nonStriker.playerId === selectedNonStriker
                                    ? currentState.nonStriker.playerName
                                    : (selectedNonStriker ? "Player " + selectedNonStriker.substr(0, 4) : "Select Player")}
                            </Text>
                            {canEdit && (
                                <TouchableOpacity onPress={() => loadAvailablePlayers('non-striker')}>
                                    <Text style={styles.changeLink}>Change</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <View style={styles.stateRow}>
                        {/* Bowler */}
                        <View style={styles.playerInfo}>
                            <Text style={styles.label}>Bowler</Text>
                            <Text style={styles.playerName}>
                                {currentState.bowler.playerId === selectedBowler
                                    ? currentState.bowler.playerName
                                    : (selectedBowler ? "Player " + selectedBowler.substr(0, 4) : "Select Player")}
                            </Text>
                            {canEdit && (
                                <TouchableOpacity onPress={() => loadAvailablePlayers('bowler')}>
                                    <Text style={styles.changeLink}>Change</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                    </View>
                </View>
            )}

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
            {canEdit && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Record Ball</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>Runs</Text>
                        <View style={styles.runButtons}>
                            {[0, 1, 2, 3, 4, 6].map((run) => (
                                <TouchableOpacity
                                    key={run}
                                    style={[styles.runButton, runs === run && styles.runButtonActive]}
                                    onPress={() => setRuns(run)}
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
                                onValueChange={(value) => setExtras(value)}
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

                    {isWicket && (
                        <View style={styles.section}>
                            <Text style={styles.label}>Wicket Type</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={wicketType}
                                    onValueChange={(value) => setWicketType(value)}
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
                            style={[styles.previewButton, recording && styles.buttonDisabled]}
                            onPress={handlePreview}
                            disabled={recording}
                        >
                            {/* Using nextState presence to indicate 'previewed' if needed, but simple trigger is fine */}
                            <Text style={styles.previewButtonText}>Preview</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitButton, recording && styles.buttonDisabled]}
                            onPress={handleRecord}
                            disabled={recording}
                        >
                            <Text style={styles.submitButtonText}>
                                {recording ? 'Recording...' : 'Record Ball'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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

            {/* Player Selection Modal */}
            <Modal
                visible={showPlayerModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPlayerModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Select {modalType === 'striker' ? 'Striker' : modalType === 'non-striker' ? 'Non-Striker' : 'Bowler'}
                        </Text>

                        {availablePlayers.length === 0 ? (
                            <Text style={styles.noPlayersText}>No players available</Text>
                        ) : (
                            <FlatList
                                data={availablePlayers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.playerItem}
                                        onPress={() => handlePlayerSelect(item.id)}
                                    >
                                        <Text style={styles.playerItemText}>
                                            {item.name} - {item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'Unknown'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowPlayerModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Match Win Modal */}
            <Modal
                visible={!!matchDetails && matchDetails.status === 'completed'}
                animationType="fade"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { alignItems: 'center', padding: 24 }]}>
                        <Text style={{ fontSize: 48, marginBottom: 10 }}>🏆</Text>
                        <Text style={[styles.modalTitle, { textAlign: 'center', fontSize: 24 }]}>MATCH FINISHED</Text>

                        <Text style={{ fontSize: 18, textAlign: 'center', marginVertical: 16, color: '#333' }}>
                            {matchDetails?.resultType === 'tie'
                                ? 'Match Tied!'
                                : matchDetails?.winnerTeamId
                                    ? `${matchDetails.winnerTeamId === matchDetails.teamAId ? matchDetails.teamA?.name : matchDetails.teamB?.name} Won!`
                                    : 'Match Completed'}
                        </Text>

                        {matchDetails?.margin ? (
                            <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
                                Won by {matchDetails.margin} {matchDetails.resultType === 'win-by-runs' ? 'runs' : 'wickets'}
                            </Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.submitButton, { width: '100%', backgroundColor: '#007AFF' }]}
                            onPress={() => {
                                // Navigate back to matches list
                                navigation.navigate('MatchList' as never);
                            }}
                        >
                            <Text style={styles.submitButtonText}>Back to Matches</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

// Reusing styles from V4
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
    viewOnlyBanner: {
        backgroundColor: '#E3F2FD',
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        alignItems: 'center',
    },
    viewOnlyText: {
        color: '#0D47A1',
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        marginBottom: 16,
    },
    retryButton: {
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
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
    changeLink: {
        fontSize: 14,
        color: '#FFA500',
        textDecorationLine: 'underline',
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
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    playerItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    playerItemText: {
        fontSize: 16,
        color: '#333',
    },
    noPlayersText: {
        textAlign: 'center',
        padding: 20,
        color: '#666',
    },
    closeButton: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#333',
        fontWeight: '600',
    },
});
