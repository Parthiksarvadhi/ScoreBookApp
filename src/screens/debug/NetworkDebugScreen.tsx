import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../../api/client';

export const NetworkDebugScreen: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing connection...');
    try {
      console.log('🧪 Testing API connection...');
      const response = await apiClient.get('/auth/me');
      setTestResult('✅ Connection successful!\n' + JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('🧪 Connection test failed:', error);
      setTestResult(
        '❌ Connection failed:\n' +
        `Status: ${error.response?.status || 'N/A'}\n` +
        `Message: ${error.message}\n` +
        `URL: ${error.config?.url}\n` +
        `Data: ${JSON.stringify(error.response?.data, null, 2)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Debug</Text>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testConnection}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test API Connection</Text>
        )}
      </TouchableOpacity>

      {testResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Configuration:</Text>
        <Text style={styles.infoText}>API URL: {process.env.EXPO_PUBLIC_API_URL}</Text>
        <Text style={styles.infoText}>Environment: {process.env.NODE_ENV || 'development'}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resultText: {
    fontSize: 12,
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
