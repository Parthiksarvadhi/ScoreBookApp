import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface PickerSelectProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  enabled?: boolean;
}

export const PickerSelect: React.FC<PickerSelectProps> = ({
  selectedValue,
  onValueChange,
  items,
  enabled = true,
}) => {
  // On web, render a simple select element
  if (Platform.OS === 'web') {
    return (
      <select
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={!enabled}
        style={styles.webSelect as any}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    );
  }

  // On native platforms, use the Picker component
  return (
    <Picker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      enabled={enabled}
    >
      {items.map((item) => (
        <Picker.Item key={item.value} label={item.label} value={item.value} />
      ))}
    </Picker>
  );
};

const styles = StyleSheet.create({
  webSelect: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    fontFamily: 'system-ui',
  },
});
