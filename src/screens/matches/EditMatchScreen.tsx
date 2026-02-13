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
import { Match } from '../../types';

export const EditMatchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [matchType, setMatchType] = useState('T20');
  const [overs, setOvers] = useState('');
  const [venue, setVenue] = useState('');

  useEffect(() => {
    loadMatch();
  }, []);

  const loadMatch = async () => {
    try {
      const data = await matchesApi.getMatch(matchId);
      setMatch(data);
      setMatchType(data.matchType);
      setOvers(String(data.overs));
      setVenue(data.venue || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load match');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!venue || !overs) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      await matchesApi.updateMatch(matchId, {
        matchType,
        overs: parseInt(overs),
        venue,
      });
      Alert.alert('Success', 'Match updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update match');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!match || match.status !== 'scheduled') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Only scheduled matches can be edited</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edit Match</Text>

      <Text style={styles.label}>Match Type</Text>
      <View style={styles.pickerContainer}>
        <PickerSelect
          selectedValue={matchType}
          onValueChange={setMatchType}
          enabled={!isSaving}
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
        editable={!isSaving}
      />

      <Text style={styles.label}>Venue</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Cricket Ground"
        value={venue}
        onChangeText={setVenue}
        editable={!isSaving}
      />

      <TouchableOpacity
        style={[styles.button, isSaving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
        onPress={() => navigation.goBack()}
        disabled={isSaving}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
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
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: '#999',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
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
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});
