import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { PickerSelect } from '../../components/PickerSelect';
import { matchesApi } from '../../api/matches';
import { teamsApi } from '../../api/teams';
import { Team } from '../../types';

import { useAuth } from '../../context/AuthContext';

export const CreateMatchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [matchType, setMatchType] = useState('T20');
  const [overs, setOvers] = useState('20');
  const [venue, setVenue] = useState('');
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    try {
      const data = await teamsApi.getTeams(user?.id);
      setTeams(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!name || !venue || !team1Id || !team2Id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (team1Id === team2Id) {
      Alert.alert('Error', 'Please select different teams');
      return;
    }

    setIsLoading(true);
    try {
      await matchesApi.createMatch(
        name,
        matchType,
        parseInt(overs),
        venue,
        team1Id,
        team2Id
      );
      Alert.alert('Success', 'Match created successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create match');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingTeams) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Match</Text>

      <Text style={styles.label}>Match Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Final Match"
        value={name}
        onChangeText={setName}
        editable={!isLoading}
      />

      <Text style={styles.label}>Match Type</Text>
      <View style={styles.pickerContainer}>
        <PickerSelect
          selectedValue={matchType}
          onValueChange={setMatchType}
          enabled={!isLoading}
          items={[
            { label: 'T20', value: 'T20' },
            { label: 'ODI', value: 'ODI' },
            { label: 'Test', value: 'Test' },
            { label: 'Custom', value: 'Custom' },
          ]}
        />
      </View>

      <Text style={styles.label}>Overs</Text>
      <TextInput
        style={styles.input}
        placeholder="20"
        value={overs}
        onChangeText={setOvers}
        keyboardType="numeric"
        editable={!isLoading}
      />

      <Text style={styles.label}>Venue</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Cricket Ground"
        value={venue}
        onChangeText={setVenue}
        editable={!isLoading}
      />

      <Text style={styles.label}>Team 1</Text>
      <View style={styles.pickerContainer}>
        <PickerSelect
          selectedValue={team1Id}
          onValueChange={setTeam1Id}
          enabled={!isLoading}
          items={[
            { label: 'Select Team 1', value: '' },
            ...teams.map((team) => ({ label: team.name, value: team.id })),
          ]}
        />
      </View>

      <Text style={styles.label}>Team 2</Text>
      <View style={styles.pickerContainer}>
        <PickerSelect
          selectedValue={team2Id}
          onValueChange={setTeam2Id}
          enabled={!isLoading}
          items={[
            { label: 'Select Team 2', value: '' },
            ...teams.map((team) => ({ label: team.name, value: team.id })),
          ]}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleCreateMatch}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Match</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 16,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
