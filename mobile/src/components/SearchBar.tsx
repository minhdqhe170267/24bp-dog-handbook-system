import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder }) => {
    const { colors } = useThemeStore();

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textLight} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || 'Tìm kiếm...'}
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text }]}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    input: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.md,
    },
});
