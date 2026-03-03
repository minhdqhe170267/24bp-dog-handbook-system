import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface InputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    leftIcon?: string;
    error?: string;
    style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    leftIcon,
    error,
    style,
}) => {
    const [focused, setFocused] = useState(false);
    const { colors } = useThemeStore();

    return (
        <View style={style}>
            {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    { borderColor: focused ? colors.primary : colors.border, backgroundColor: colors.surface },
                    error ? { borderColor: colors.error } : null,
                ]}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon as any}
                        size={20}
                        color={focused ? colors.primary : colors.textLight}
                        style={{ marginRight: spacing.sm }}
                    />
                )}
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textLight}
                    secureTextEntry={secureTextEntry}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={[styles.input, { color: colors.text }]}
                />
            </View>
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
    },
    input: {
        flex: 1,
        fontSize: fontSize.md,
        paddingVertical: spacing.xs,
    },
    error: {
        fontSize: fontSize.xs,
        marginTop: spacing.xs,
    },
});
