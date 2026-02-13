import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { teamsApi } from '../../api/teams';
import { Team } from '../../types';
import { theme } from '../../styles/theme';
import { TeamLogo } from '../../components/TeamLogo';
import { useAuth } from '../../context/AuthContext';

export const TeamListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Only load teams once we have the user ID to filter by
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    try {
      // Pass userId to filter teams by creator
      const data = await teamsApi.getTeams(user?.id);
      setTeams(data);
      console.log("data", data);
      console.log("user", user);
    } catch (error) {
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    setRefreshing(false);
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.teamHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TeamLogo team={item} size={48} style={{ marginRight: 12 }} />
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>
            {item.shortName && (
              <Text style={styles.teamShortName}>{item.shortName}</Text>
            )}
          </View>
        </View>

        <View style={styles.playerCountBadge}>
          <Feather name="users" size={14} color={theme.colors.text.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.playerCountText}>{item.players?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Feather name="chevron-right" size={16} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <View style={styles.container}>
        <FlatList
          data={teams}
          renderItem={renderTeam}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="shield" size={48} color={theme.colors.text.hint} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No teams yet</Text>
              <Text style={styles.emptySubText}>Create your first team to get started</Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateTeam')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: 80, // Space for FAB
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.s,
  },
  teamInfo: {
    flex: 1,
    marginRight: theme.spacing.m,
  },
  teamName: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  teamShortName: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerCountText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  viewDetailsText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginRight: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...theme.typography.h3,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  emptySubText: {
    ...theme.typography.body,
    color: theme.colors.text.hint,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
});
