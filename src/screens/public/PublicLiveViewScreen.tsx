import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { matchesApi } from '../../api/matches';

export const PublicLiveViewScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [matchId, setMatchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleViewMatch = async () => {
    if (!matchId.trim()) {
      Alert.alert('Error', 'Please enter a match ID');
      return;
    }

    setIsLoading(true);
    try {
      // Verify match exists
      const match = await matchesApi.getMatch(matchId);
      if (!match) {
        Alert.alert('Error', 'Match not found');
        return;
      }

      // Navigate to public live match view
      navigation.navigate('PublicLiveMatch', { matchId });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏏 Live Cricket Match</Text>
        <Text style={styles.subtitle}>View live scores and match updates</Text>
      </View>

      {/* Match ID Input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter Match ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste match ID here"
          placeholderTextColor="#999"
          value={matchId}
          onChangeText={setMatchId}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleViewMatch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>View Live Match</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to Use</Text>
        <Text style={styles.instruction}>
          1. Get the match ID from the scorer or match organizer
        </Text>
        <Text style={styles.instruction}>
          2. Paste the match ID in the field above
        </Text>
        <Text style={styles.instruction}>
          3. Click "View Live Match" to see live score
        </Text>
        <Text style={styles.instruction}>
          4. Score updates automatically every 5 seconds
        </Text>
      </View>

      {/* Features */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Features</Text>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Live Score Updates</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureText}>Current Batsmen Stats</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🎯</Text>
          <Text style={styles.featureText}>Bowler Statistics</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔄</Text>
          <Text style={styles.featureText}>Auto-Refresh Every 5 Seconds</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>📈</Text>
          <Text style={styles.featureText}>Match Information</Text>
        </View>
      </View>

      {/* Example */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Example Match ID</Text>
        <Text style={styles.exampleId}>f3e91e61-84b1-43dd-9c26-a95ef0e8613d</Text>
        <Text style={styles.exampleNote}>
          Ask the match organizer for the match ID to view live updates
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 12,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  exampleId: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  exampleNote: {
    fontSize: 12,
    color: '#999',
  },
});
