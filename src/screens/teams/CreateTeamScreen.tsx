import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { teamsApi } from '../../api/teams';
import { theme } from '../../styles/theme';
import { TeamLogo } from '../../components/TeamLogo';

const COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#1F2937', // Gray
  '#000000', // Black
  '#2E7D32', // Cricket Green
];

export const CreateTeamScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [logo, setLogo] = useState('');
  const [primaryColor, setPrimaryColor] = useState(COLORS[9]); // Default to Cricket Green
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogo(result.assets[0].uri);
    }
  };

  const handleCreateTeam = async () => {
    if (!name || !shortName) {
      Alert.alert('Error', 'Please fill in Team Name and Short Name');
      return;
    }

    if (shortName.length > 3) {
      Alert.alert('Error', 'Short name must be 3 characters or less');
      return;
    }

    setIsLoading(true);
    try {
      let finalLogoUrl = logo;
      if (logo && !logo.startsWith('http')) {
        // It's a local URI, upload it
        try {
          const uploadedUrl = await teamsApi.uploadImage(logo);
          // Backend returns relative path, prepend base URL if needed, 
          // but our TeamLogo component should handle full URLs.
          // Actually, the upload endpoint returns relative URL e.g. /uploads/filename.jpg
          // We should store the full URL or handle relative in TeamLogo.
          // Let's assume we store relative and configured API_URL base in frontend.
          // For now, let's just save what backend returns.
          finalLogoUrl = uploadedUrl;
        } catch (uploadError) {
          console.error("Upload failed", uploadError);
          Alert.alert('Warning', 'Image upload failed, creating team without logo');
          finalLogoUrl = '';
        }
      }

      await teamsApi.createTeam(name, shortName, finalLogoUrl, primaryColor);
      Alert.alert('Success', 'Team created successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Team</Text>
          <Text style={styles.subtitle}>Enter team details below</Text>
        </View>

        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview</Text>
          <TouchableOpacity onPress={pickImage} style={styles.previewBox}>
            <TeamLogo
              team={{ name: name || 'Team Name', logo, primaryColor }}
              size={80}
            />
            {!logo && <Text style={styles.uploadHint}>Tap to select logo</Text>}
            <Text style={styles.previewName}>{name || 'Team Name'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Team Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mumbai Indians"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Short Name (3 chars max)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., MI"
            value={shortName}
            onChangeText={(text) => setShortName(text.toUpperCase().slice(0, 3))}
            maxLength={3}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Logo</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.input, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}
              onPress={pickImage}
            >
              <Text style={{ color: theme.colors.text.secondary }}>
                {logo ? 'Change Image' : 'Select Image from Gallery'}
              </Text>
            </TouchableOpacity>
            {logo ? (
              <TouchableOpacity
                style={{ justifyContent: 'center', padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8 }}
                onPress={() => setLogo('')}
              >
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Team Color</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  primaryColor === color && styles.selectedColor,
                ]}
                onPress={() => setPrimaryColor(color)}
              >
                {primaryColor === color && (
                  <Feather name="check" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCreateTeam}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Team</Text>
          )}
        </TouchableOpacity>
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
  header: {
    marginBottom: theme.spacing.l,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  previewLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.s,
  },
  uploadHint: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
  },
  previewBox: {
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewName: {
    ...theme.typography.h3,
    marginTop: theme.spacing.s,
    color: theme.colors.text.primary,
  },
  formGroup: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: theme.colors.text.primary,
    transform: [{ scale: 1.1 }],
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
