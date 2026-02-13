import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Match, LiveScore, Player } from '../../types';
import { theme } from '../../styles/theme';
import { Feather } from '@expo/vector-icons';
import { TeamLogo } from '../../components/TeamLogo';

const { width } = Dimensions.get('window');

type TabType = 'Live' | 'Scorecard' | 'Playing XI' | 'Info' | 'Debug';

const TabButton: React.FC<{
  title: TabType;
  active: boolean;
  onPress: () => void;
}> = ({ title, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.activeTabButton]}
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
      {title}
    </Text>
    {active && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export const PublicLiveMatchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const matchId: string = route.params?.matchId;
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, Player>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('Live');

  useEffect(() => {
    loadMatchData();
    const interval = setInterval(loadMatchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMatchData = async () => {
    try {
      // Fetch both live score and match details
      const [scoreData, matchData] = await Promise.all([
        matchesApi.getLiveScore(matchId),
        matchesApi.getMatch(matchId)
      ]);

      console.log(`[PublicLiveMatchScreen] 📥 Live score data received for match ${matchId}:`, {
        status: scoreData?.status,
        striker: scoreData?.striker?.playerName,
        nonStriker: scoreData?.nonStriker?.playerName,
        battingScorecard: scoreData?.battingScorecard?.length || 0,
        teams: scoreData?.teams ? 'Yes' : 'No'
      });

      setLiveScore(scoreData);
      setMatch(matchData);

      // Fetch players for both teams if we have team IDs
      if (matchData && (matchData.teamAId || matchData.teamBId)) {
        const teamIds = [matchData.teamAId, matchData.teamBId].filter(Boolean) as string[];

        try {
          const playersData = await Promise.all(
            teamIds.map(teamId => teamsApi.getTeamPlayers(teamId))
          );

          // Create a player lookup map
          const playerMap: Record<string, Player> = {};
          playersData.flat().forEach(player => {
            playerMap[player.id] = player;
          });

          setTeamPlayers(playerMap);
          console.log(`[PublicLiveMatchScreen] 👥 Loaded ${Object.keys(playerMap).length} players`);
        } catch (playerError) {
          console.error('Error loading team players:', playerError);
        }
      }
    } catch (error) {
      console.error('Error loading live score:', error);
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!liveScore) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load live score</Text>
      </View>
    );
  }

  const renderLiveTab = () => (
    <View style={styles.tabContent}>
      {/* Current Batter/Bowler Summary */}
      <View style={styles.matchStateCard}>
        <View style={styles.stateRow}>
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>Striker</Text>
            <Text style={styles.stateValue}>{liveScore.striker?.playerName || '-'}</Text>
            <Text style={styles.stateSubValue}>{liveScore.striker ? `${liveScore.striker.runs} (${liveScore.striker.ballsFaced})` : ''}</Text>
          </View>
          <View style={styles.stateDivider} />
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>Non-Striker</Text>
            <Text style={styles.stateValue}>{liveScore.nonStriker?.playerName || '-'}</Text>
            <Text style={styles.stateSubValue}>{liveScore.nonStriker ? `${liveScore.nonStriker.runs} (${liveScore.nonStriker.ballsFaced})` : ''}</Text>
          </View>
        </View>
        <View style={[styles.stateRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' }]}>
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>Current Bowler</Text>
            <Text style={styles.stateValue}>{liveScore.bowler?.playerName || '-'}</Text>
            <Text style={styles.stateSubValue}>{liveScore.bowler ? `${liveScore.bowler.wickets}-${liveScore.bowler.runsConceded} (${Math.floor(liveScore.bowler.ballsBowled / 6)}.${liveScore.bowler.ballsBowled % 6})` : ''}</Text>
          </View>
        </View>
      </View>

      {/* Recent Balls */}
      <Section title="Recent Balls">
        <View style={styles.recentBallsRow}>
          {(liveScore.recentBalls || []).map((ball, idx) => (
            <View key={idx} style={[
              styles.ballCircle,
              ball.isWicket && styles.wicketBall,
              ball.runs === 4 && styles.fourBall,
              ball.runs === 6 && styles.sixBall,
              (ball.extras !== 'none') && styles.extraBall
            ]}>
              <Text style={[styles.ballText, (ball.isWicket || ball.runs === 4 || ball.runs === 6) && styles.whiteText]}>
                {ball.isWicket ? 'W' : (ball.extras !== 'none' ? `${ball.runs}${ball.extras[0].toUpperCase()}` : ball.runs)}
              </Text>
            </View>
          ))}
          {(!liveScore.recentBalls || liveScore.recentBalls.length === 0) && (
            <Text style={{ color: '#999', fontSize: 12, fontStyle: 'italic', paddingLeft: 4 }}>Waiting for first ball...</Text>
          )}
        </View>
      </Section>

      {/* Over by Over Summary */}
      <Section title="Overs History">
        {(liveScore.overs || []).slice(0, 5).map(over => (
          <View key={over.overNumber} style={styles.overSummaryRow}>
            <Text style={styles.overNumberText}>Ov {over.overNumber}</Text>
            <View style={styles.overBallsRow}>
              {(over.balls || []).map((ball, idx) => (
                <Text key={idx} style={[styles.overBallText, ball.isWicket && { color: '#FF3B30', fontWeight: 'bold' }]}>
                  {ball.isWicket ? 'W' : (ball.extras !== 'none' ? `${ball.runs}${ball.extras[0].toUpperCase()}` : ball.runs)}
                </Text>
              ))}
            </View>
            <Text style={styles.overTotalText}>{over.runs} runs</Text>
          </View>
        ))}
        {(!liveScore.overs || liveScore.overs.length === 0) && (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#999', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>No overs recorded yet</Text>
          </View>
        )}
      </Section>
    </View>
  );

  const renderScorecardTab = () => {
    // Use the actual fields from the backend response
    const hasBattingData = liveScore.battingScorecard && liveScore.battingScorecard.length > 0;

    return (
      <ScrollView style={styles.tabContent}>
        {/* First Innings (if in 2nd innings) */}
        {liveScore.currentInnings === 2 && liveScore.firstInningsTotal && (
          <View style={styles.cardWrapper}>
            <Section title={`First Innings - ${liveScore.firstInningsTotal.runs}/${liveScore.firstInningsTotal.wickets} (${liveScore.firstInningsTotal.overs})`}>
              <Text style={styles.inningsSummary}>
                Completed
              </Text>
            </Section>
          </View>
        )}

        {/* Current Innings */}
        {hasBattingData ? (
          <View style={styles.cardWrapper}>
            <Section title={`${liveScore.battingTeam.teamName} - Innings ${liveScore.currentInnings}`}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryScore}>{liveScore.battingTeam.runs}/{liveScore.battingTeam.wickets}</Text>
                <Text style={styles.summaryOvers}>({liveScore.battingTeam.overs} Ov)</Text>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.cellName]}>Batter</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>R</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>B</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>4s</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>6s</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>SR</Text>
              </View>
              {liveScore.battingScorecard?.map(p => (
                <View key={p.id} style={styles.tableRow}>
                  <View style={styles.cellNameContainer}>
                    <Text style={[styles.playerNameTable, p.status === 'batting' && { color: theme.colors.primary }]}>
                      {p.name}{p.status === 'batting' ? '*' : ''}
                    </Text>
                    <Text style={styles.dismissalText} numberOfLines={1}>
                      {p.status === 'did_not_bat' ? 'yet to bat' : (p.dismissal || 'not out')}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, styles.cellStat, styles.boldText]}>{p.runs}</Text>
                  <Text style={[styles.tableCell, styles.cellStat]}>{p.balls}</Text>
                  <Text style={[styles.tableCell, styles.cellStat]}>{p.fours || 0}</Text>
                  <Text style={[styles.tableCell, styles.cellStat]}>{p.sixes || 0}</Text>
                  <Text style={[styles.tableCell, styles.cellStat]}>{p.strikeRate}</Text>
                </View>
              ))}

              {liveScore.extras && (
                <View style={styles.extrasRow}>
                  <Text style={styles.extrasLabel}>Extras</Text>
                  <Text style={styles.extrasValue}>
                    {liveScore.extras.total} (w {liveScore.extras.wides}, nb {liveScore.extras.noBalls}, b {liveScore.extras.byes}, lb {liveScore.extras.legByes})
                  </Text>
                </View>
              )}

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.cellName]}>Bowler</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>O</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>W</Text>
                <Text style={[styles.tableHeaderCell, styles.cellStat]}>EC</Text>
              </View>
              {(liveScore.bowlingScorecard && liveScore.bowlingScorecard.length > 0) ? (
                liveScore.bowlingScorecard.map(b => (
                  <View key={b.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.cellName]}>{b.name}</Text>
                    <Text style={[styles.tableCell, styles.cellStat]}>{b.overs}</Text>
                    <Text style={[styles.tableCell, styles.cellStat, styles.boldText]}>{b.wickets}</Text>
                    <Text style={[styles.tableCell, styles.cellStat]}>{b.economy}</Text>
                  </View>
                ))
              ) : (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#999', fontSize: 12 }}>No bowling data available</Text>
                </View>
              )}
            </Section>
          </View>
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Feather name="list" size={48} color="#ccc" />
            <Text style={{ color: '#999', fontSize: 16, marginTop: 16 }}>No scorecard data available yet</Text>
            <Text style={{ color: '#bbb', fontSize: 12, marginTop: 8 }}>Match Status: {liveScore?.status || 'Live'}</Text>
          </View>
        )}
      </ScrollView>
    );
  };


  const renderPlayingXI = () => {
    // Get playing XI from match data
    const teamAPlayers = match?.teamAPlaying11 || [];
    const teamBPlayers = match?.teamBPlaying11 || [];

    // Helper to find player data from battingScorecard
    const findPlayerData = (playerId: string) => {
      return liveScore.battingScorecard?.find(p => p.id === playerId);
    };

    const renderTeamPlayers = (playerIds: string[], teamName: string) => {
      if (playerIds.length === 0) {
        return <Text style={{ padding: 12, color: '#999', textAlign: 'center' }}>No lineup available</Text>;
      }

      return playerIds.map((playerId, idx) => {
        // Try to find player data from battingScorecard first (for live stats)
        const livePlayerData = findPlayerData(playerId);
        // Get player info from teamPlayers (for name and role)
        const playerInfo = teamPlayers[playerId];

        // Use name from either source
        const playerName = livePlayerData?.name || playerInfo?.name || `Player ${idx + 1}`;

        return (
          <View key={playerId} style={styles.playerListItem}>
            <Text style={styles.playerIndex}>{idx + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName}>{playerName}</Text>
              {playerInfo?.role && (
                <Text style={styles.playerRole}>{playerInfo.role}</Text>
              )}
            </View>
          </View>
        );
      });
    };

    return (
      <ScrollView style={styles.tabContent}>
        <Section title={`${match?.teamA?.name || 'Team A'} Playing XI`}>
          {renderTeamPlayers(teamAPlayers, match?.teamA?.name || 'Team A')}
        </Section>

        <Section title={`${match?.teamB?.name || 'Team B'} Playing XI`}>
          {renderTeamPlayers(teamBPlayers, match?.teamB?.name || 'Team B')}
        </Section>
      </ScrollView>
    );
  };

  const renderDebugTab = () => (
    <View style={styles.tabContent}>
      <Section title="Raw Live Score Data">
        <ScrollView horizontal style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 8 }}>
          <Text style={{ fontFamily: 'monospace', fontSize: 10 }}>
            {JSON.stringify(liveScore, null, 2)}
          </Text>
        </ScrollView>
      </Section>
    </View>
  );

  const renderInfoTab = () => (
    <ScrollView style={styles.tabContent}>
      <Section title="Match Information">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Venue</Text>
          <Text style={styles.infoValue}>{match?.venue || 'Not specified'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Match Type</Text>
          <Text style={styles.infoValue}>{match?.matchType || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Overs</Text>
          <Text style={styles.infoValue}>{match?.overs || 20} overs per side</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{match?.status || 'Live'}</Text>
        </View>
      </Section>

      <Section title="Current Innings">
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Innings</Text>
          <Text style={styles.infoValue}>{liveScore.currentInnings}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Batting Team</Text>
          <Text style={styles.infoValue}>{liveScore.battingTeam.teamName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fielding Team</Text>
          <Text style={styles.infoValue}>{liveScore.fieldingTeam.teamName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Score</Text>
          <Text style={styles.infoValue}>{liveScore.battingTeam.runs}/{liveScore.battingTeam.wickets} ({liveScore.battingTeam.overs})</Text>
        </View>
        {liveScore.target && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target</Text>
            <Text style={styles.infoValue}>{liveScore.target} runs</Text>
          </View>
        )}
        {liveScore.runsNeeded && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Runs Needed</Text>
            <Text style={styles.infoValue}>{liveScore.runsNeeded} from {liveScore.ballsRemaining} balls</Text>
          </View>
        )}
      </Section>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Team Matchup Header */}
      <View style={styles.header}>
        <View style={styles.matchupContainer}>
          {/* Team A - Logo and Name in Row */}
          <View style={styles.teamMatchupSide}>
            <TeamLogo team={match?.teamA} size={40} />
            <Text style={styles.teamNameLarge} numberOfLines={1}>
              {match?.teamA?.name || 'Team A'}
            </Text>
          </View>

          {/* VS */}
          <Text style={styles.vsText}>vs</Text>

          {/* Team B - Logo and Name in Row */}
          <View style={styles.teamMatchupSide}>
            <Text style={styles.teamNameLarge} numberOfLines={1}>
              {match?.teamB?.name || 'Team B'}
            </Text>
            <TeamLogo team={match?.teamB} size={40} />
          </View>
        </View>

        {/* Current Score */}
        <View style={styles.scoreInfoRow}>
          <Text style={styles.currentScoreText}>
            {liveScore.battingTeam?.teamName}: {liveScore.battingTeam?.runs ?? 0}/{liveScore.battingTeam?.wickets ?? 0} ({liveScore.battingTeam?.overs ?? '0.0'})
          </Text>
          <Text style={styles.runRateText}>CRR: {liveScore.battingTeam?.runRate ?? '0.00'}</Text>
        </View>

        {liveScore.runsNeeded !== undefined && (
          <Text style={styles.statusText}>
            Need {liveScore.runsNeeded} runs in {liveScore.ballsRemaining} balls | RRR: {liveScore.requiredRunRate}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TabButton title="Live" active={activeTab === 'Live'} onPress={() => setActiveTab('Live')} />
        <TabButton title="Scorecard" active={activeTab === 'Scorecard'} onPress={() => setActiveTab('Scorecard')} />
        <TabButton title="Playing XI" active={activeTab === 'Playing XI'} onPress={() => setActiveTab('Playing XI')} />
        <TabButton title="Info" active={activeTab === 'Info'} onPress={() => setActiveTab('Info')} />
        ?     </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'Live' && renderLiveTab()}
        {activeTab === 'Scorecard' && renderScorecardTab()}
        {activeTab === 'Playing XI' && renderPlayingXI()}
        {activeTab === 'Info' && renderInfoTab()}
        {activeTab === 'Debug' && renderDebugTab()}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTeamName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#1a1a1a',
  },
  headerScoreContainer: {
    alignItems: 'flex-end',
  },
  headerScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerOvers: {
    fontSize: 14,
    color: '#666',
  },
  headerStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerStatText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabButtonText: {
    color: theme.colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },

  // Content
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },

  // Sections
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    ...theme.shadows.small,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Live Summary Card
  matchStateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    ...theme.shadows.small,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateItem: {
    flex: 1,
    alignItems: 'center',
  },
  stateDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  stateLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  stateSubValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Recent Balls
  recentBallsRow: {
    flexDirection: 'row',
    padding: 16,
    flexWrap: 'wrap',
  },
  ballCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  ballText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  wicketBall: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  fourBall: { backgroundColor: '#4CD964', borderColor: '#4CD964' },
  sixBall: { backgroundColor: '#5856D6', borderColor: '#5856D6' },
  extraBall: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  whiteText: { color: '#fff' },

  // Overs Summary
  overSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9f9f9',
  },
  overNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    width: 50,
  },
  overBallsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  overBallText: {
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  overTotalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },

  // Scorecard
  cardWrapper: {
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summaryOvers: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fbfbfb',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  cellName: { flex: 2.5, textAlign: 'left' },
  cellNameContainer: { flex: 2.5 },
  cellStat: { flex: 0.8, textAlign: 'center' },
  playerNameTable: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  dismissalText: { fontSize: 11, color: '#999', marginTop: 2 },
  boldText: { fontWeight: '700' },
  extrasRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  extrasLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginRight: 8 },
  extrasValue: { fontSize: 13, color: '#666' },

  // Playing 11
  playerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9f9f9',
  },
  playerIndex: {
    fontSize: 13,
    color: '#999',
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  playerRole: {
    fontSize: 12,
    color: '#888',
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f9f9f9',
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#888',
  },
  infoValue: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inningsSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    padding: 12,
  },
  playerStats: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Team Matchup Header Styles
  matchupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamMatchupSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  teamNameLarge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 12,
  },
  scoreInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentScoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  runRateText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
