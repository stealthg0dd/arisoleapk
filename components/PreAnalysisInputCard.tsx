/**
 * PreAnalysisInputCard.tsx - Pre-Analysis Goal Selection Card
 * 
 * Light-themed card that asks users about their gait/running focus area
 * before starting an analysis. This input is fed to Claude AI for
 * personalized recommendations.
 * 
 * Focus Areas:
 * - Speed
 * - Stride Length
 * - Stability
 * - Endurance
 * - Injury Prevention
 * - Other (custom input)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for persisting user's focus preference
const FOCUS_STORAGE_KEY = '@arisole_gait_focus';

// Focus area options
const FOCUS_OPTIONS = [
  { id: 'speed', label: 'Speed', icon: 'flash' as const, description: 'Run faster' },
  { id: 'stride', label: 'Stride Length', icon: 'resize' as const, description: 'Longer steps' },
  { id: 'stability', label: 'Stability', icon: 'shield-checkmark' as const, description: 'Better balance' },
  { id: 'endurance', label: 'Endurance', icon: 'heart' as const, description: 'Run longer' },
  { id: 'injury', label: 'Injury Prevention', icon: 'medkit' as const, description: 'Stay healthy' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' as const, description: 'Custom goal' },
];

interface PreAnalysisInputCardProps {
  onFocusSelected?: (focus: string, customNote?: string) => void;
  compact?: boolean;
}

const PreAnalysisInputCard: React.FC<PreAnalysisInputCardProps> = ({
  onFocusSelected,
  compact = false,
}) => {
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Load saved focus on mount
  React.useEffect(() => {
    loadSavedFocus();
  }, []);

  const loadSavedFocus = async () => {
    try {
      const saved = await AsyncStorage.getItem(FOCUS_STORAGE_KEY);
      if (saved) {
        const { focus, note } = JSON.parse(saved);
        setSelectedFocus(focus);
        if (note) setCustomNote(note);
      }
    } catch (error) {
      console.error('[PreAnalysis] Error loading saved focus:', error);
    }
  };

  const handleFocusSelect = async (focusId: string) => {
    setSelectedFocus(focusId);
    
    // Save selection
    try {
      await AsyncStorage.setItem(
        FOCUS_STORAGE_KEY,
        JSON.stringify({ focus: focusId, note: customNote })
      );
    } catch (error) {
      console.error('[PreAnalysis] Error saving focus:', error);
    }

    // Notify parent
    onFocusSelected?.(focusId, focusId === 'other' ? customNote : undefined);
  };

  const handleCustomNoteChange = async (text: string) => {
    setCustomNote(text);
    
    // Save with custom note
    if (selectedFocus === 'other') {
      try {
        await AsyncStorage.setItem(
          FOCUS_STORAGE_KEY,
          JSON.stringify({ focus: 'other', note: text })
        );
        onFocusSelected?.('other', text);
      } catch (error) {
        console.error('[PreAnalysis] Error saving custom note:', error);
      }
    }
  };

  // Compact view - just show current selection
  if (compact && !isExpanded) {
    return (
      <Animated.View entering={FadeInUp.delay(250).duration(500)}>
        <TouchableOpacity
          style={styles.compactCard}
          onPress={() => setIsExpanded(true)}
        >
          <View style={styles.compactContent}>
            <Ionicons name="fitness" size={20} color="#F26F05" />
            <Text style={styles.compactText}>
              {selectedFocus
                ? `Focus: ${FOCUS_OPTIONS.find((f) => f.id === selectedFocus)?.label}`
                : 'Set your gait improvement goal'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(250).duration(500)}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="options" size={22} color="#F26F05" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Your Focus Area</Text>
            <Text style={styles.subtitle}>
              What do you want to improve?
            </Text>
          </View>
          {compact && (
            <TouchableOpacity
              style={styles.collapseButton}
              onPress={() => setIsExpanded(false)}
            >
              <Ionicons name="chevron-up" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Focus Options Grid */}
        <View style={styles.optionsGrid}>
          {FOCUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                selectedFocus === option.id && styles.optionButtonSelected,
              ]}
              onPress={() => handleFocusSelect(option.id)}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={selectedFocus === option.id ? '#fff' : '#F26F05'}
              />
              <Text
                style={[
                  styles.optionLabel,
                  selectedFocus === option.id && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Input (when "Other" selected) */}
        {selectedFocus === 'other' && (
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="Describe your goal (e.g., reduce knee pain)..."
              placeholderTextColor="#999"
              value={customNote}
              onChangeText={handleCustomNoteChange}
              multiline
              maxLength={200}
            />
          </View>
        )}

        {/* Selection Feedback */}
        {selectedFocus && selectedFocus !== 'other' && (
          <View style={styles.feedbackContainer}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.feedbackText}>
              Your AI analysis will focus on{' '}
              <Text style={styles.feedbackHighlight}>
                {FOCUS_OPTIONS.find((f) => f.id === selectedFocus)?.label.toLowerCase()}
              </Text>{' '}
              improvements
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Export function to get saved focus for AI analysis
export async function getSavedGaitFocus(): Promise<{ focus: string; note?: string } | null> {
  try {
    const saved = await AsyncStorage.getItem(FOCUS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('[PreAnalysis] Error getting saved focus:', error);
  }
  return null;
}

// Export function to clear saved focus
export async function clearSavedGaitFocus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FOCUS_STORAGE_KEY);
  } catch (error) {
    console.error('[PreAnalysis] Error clearing focus:', error);
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(242, 111, 5, 0.1)',
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(242, 111, 5, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  collapseButton: {
    padding: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: 'rgba(242, 111, 5, 0.2)',
    gap: 6,
  },
  optionButtonSelected: {
    backgroundColor: '#F26F05',
    borderColor: '#F26F05',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F26F05',
  },
  optionLabelSelected: {
    color: '#fff',
  },
  customInputContainer: {
    marginTop: 16,
  },
  customInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },
  feedbackHighlight: {
    fontWeight: '600',
  },
});

export default PreAnalysisInputCard;
