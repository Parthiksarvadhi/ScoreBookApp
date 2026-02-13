import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { PickerSelect } from '../../components/PickerSelect';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, Player } from '../../types';
import { theme } from '../../styles/theme';
import { Feather } from '@expo/vector-icons';
import { TeamLogo } from '../../components/TeamLogo';

export const SelectBatsmenScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Teams info for display
  const [battingTeamName, setBattingTeamName] = useState('');
  const [fieldingTeamName, setFieldingTeamName] = useState('');

  const [batsmanPlayers, setBatsmanPlayers] = useState<Player[]>([]);
  const [bowlerPlayers, setBowlerPlayers] = useState<Player[]>([]);
  const [batsman1Id, setBatsman1Id] = useState('');
  const [batsman2Id, setBatsman2Id] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  useEffect(() => {
    loadMatchData();
  }, []);

  const loadMatchData = async () => {
    try {
      const matchData = await matchesApi.getMatch(matchId);
      setMatch(matchData);

      // Get batting team (team that won toss and chose to bat, or lost toss and was sent to bat)
      const isTeamABatting = (matchData.tossWinnerId === matchData.teamAId && matchData.tossChoice === 'bat') ||
        (matchData.tossWinnerId === matchData.teamBId && matchData.tossChoice === 'field');

      const batingTeamId = isTeamABatting ? matchData.teamAId : matchData.teamBId;
      const fieldingTeamId = isTeamABatting ? matchData.teamBId : matchData.teamAId;

      setBattingTeamName(isTeamABatting ? (matchData.teamA?.name || 'Team 1') : (matchData.teamB?.name || 'Team 2'));
      setFieldingTeamName(isTeamABatting ? (matchData.teamB?.name || 'Team 2') : (matchData.teamA?.name || 'Team 1'));

      // Load batting team players
      let batsmenList: Player[] = [];
      if (batingTeamId) {
        const allBatsmen = await teamsApi.getTeamPlayers(batingTeamId);
        const battingPlaying11Ids = isTeamABatting ? matchData.teamAPlaying11 : matchData.teamBPlaying11;
        batsmenList = battingPlaying11Ids
          ? allBatsmen.filter((p: Player) => battingPlaying11Ids.includes(p.id))
          : allBatsmen;
        setBatsmanPlayers(batsmenList);
      }

      // Load fielding team players (for bowler)
      let bowlersList: Player[] = [];
      if (fieldingTeamId) {
        const allBowlers = await teamsApi.getTeamPlayers(fieldingTeamId);
        const fieldingPlaying11Ids = !isTeamABatting ? matchData.teamAPlaying11 : matchData.teamBPlaying11;
        bowlersList = fieldingPlaying11Ids
          ? allBowlers.filter((p: Player) => fieldingPlaying11Ids.includes(p.id))
          : allBowlers;
        setBowlerPlayers(bowlersList);
      }

      // Get batting order for the batting team
      const battingOrder = isTeamABatting
        ? matchData.teamABattingOrder
        : matchData.teamBBattingOrder;

      // Set default batsmen from batting order
      if (battingOrder && battingOrder.length >= 2) {
        setBatsman1Id(battingOrder[0]);
        setBatsman2Id(battingOrder[1]);
      }

      // Set default bowler as first player from fielding team
      if (bowlersList.length > 0) {
        setBowlerId(bowlersList[0].id);
      }
    } catch (error) {
      console.error('Error loading match data:', error);
      Alert.alert('Error', 'Failed to load match data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScoring = async () => {
    if (!batsman1Id || !batsman2Id || !bowlerId) {
      Alert.alert('Missing Info', 'Please select both opening batsmen and a bowler.');
      return;
    }

    if (batsman1Id === batsman2Id) {
      Alert.alert('Invalid Selection', 'Striker and Non-Striker cannot be the same player.');
      return;
    }

    setIsSaving(true);
    try {
      // Only start match if not already started
      if (match?.status !== 'live') {
        await matchesApi.startMatch(matchId, {
          strikerId: batsman1Id,
          nonStrikerId: batsman2Id,
          bowlerId: bowlerId
        });
      }

      // Navigate to ball scoring with batsmen and bowler info
      navigation.replace('BallScoring', {
        matchId,
        batsman1Id,
        batsman2Id,
        bowlerId,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start match');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

  const batsmanOptions = batsmanPlayers.map((player) => ({
    label: `${player.name} (${player.role || 'Player'})`,
    value: player.id,
  }));

  const bowlerOptions = bowlerPlayers.map((player) => ({
    label: `${player.name} (${player.role || 'Player'})`,
    value: player.id,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <Text style={styles.screenTitle}>Match Launch</Text>
          <Text style={styles.screenSubtitle}>Confirm opening players to begin</Text>
        </View>

        {match?.status === 'live' && (
          <View style={styles.infoBox}>
            <Feather name="check-circle" size={20} color={theme.colors.success} />
            <Text style={styles.infoBoxText}>Match is already live. Resuming...</Text>
          </View>
        )}

        {/* Batting Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Feather name="user" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Opening Batsmen</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <TeamLogo
                  team={match?.teamAId === (match?.tossWinnerId === match?.teamAId && match?.tossChoice === 'bat' || match?.tossWinnerId === match?.teamBId && match?.tossChoice === 'field' ? match?.teamAId : match?.teamBId) ? match?.teamA : match?.teamB}
                  size={24}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.cardSubtitle}>{battingTeamName} (Batting)</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Striker (On Strike)</Text>
            <View style={styles.pickerWrapper}>
              <PickerSelect
                selectedValue={batsman1Id}
                onValueChange={setBatsman1Id}
                items={[{ label: 'Select Striker', value: '' }, ...batsmanOptions]}
                enabled={!isSaving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Non-Striker</Text>
            <View style={styles.pickerWrapper}>
              <PickerSelect
                selectedValue={batsman2Id}
                onValueChange={setBatsman2Id}
                items={[{ label: 'Select Non-Striker', value: '' }, ...batsmanOptions]}
                enabled={!isSaving}
              />
            </View>
          </View>
        </View>

        {/* Bowling Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: '#FF950020' }]}>
              <Feather name="loader" size={18} color="#FF9500" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Opening Bowler</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <TeamLogo
                  team={match?.teamAId !== (match?.tossWinnerId === match?.teamAId && match?.tossChoice === 'bat' || match?.tossWinnerId === match?.teamBId && match?.tossChoice === 'field' ? match?.teamAId : match?.teamBId) ? match?.teamA : match?.teamB}
                  size={24}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.cardSubtitle}>{fieldingTeamName} (Fielding)</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bowler</Text>
            <View style={styles.pickerWrapper}>
              <PickerSelect
                selectedValue={bowlerId}
                onValueChange={setBowlerId}
                items={[{ label: 'Select Bowler', value: '' }, ...bowlerOptions]}
                enabled={!isSaving}
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.startButton, isSaving && styles.buttonDisabled]}
            onPress={handleStartScoring}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.startButtonText}>Start Scoring</Text>
                <Feather name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.m,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: theme.spacing.l,
    marginTop: theme.spacing.s,
  },
  screenTitle: {
    ...theme.typography.h1,
    fontSize: 28,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  screenSubtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.m,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  inputGroup: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.s,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden', // Ensure styling stays inside
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  infoBoxText: {
    ...theme.typography.bodySmall,
    color: theme.colors.success,
    marginLeft: theme.spacing.s,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: theme.spacing.s,
    gap: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  startButtonText: {
    ...theme.typography.button,
    color: theme.colors.text.inverse,
    fontSize: 18,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.text.secondary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
});
