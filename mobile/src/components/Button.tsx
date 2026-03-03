import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { spacing, fontSize, borderRadius } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
}) => {
    const { colors } = useThemeStore();

    const getStyles = () => {
        switch (variant) {
            case 'secondary':
                return { bg: colors.accent, text: colors.white };
            case 'outline':
                return { bg: 'transparent', text: colors.primary, border: colors.primary };
            case 'danger':
                return { bg: colors.error, text: colors.white };
            default:
                return { bg: colors.primary, text: colors.white };
        }
    };

    const s = getStyles();

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.button,
                { backgroundColor: s.bg },
                s.border ? { borderWidth: 1, borderColor: s.border } : null,
                (disabled || loading) && { opacity: 0.6 },
                style,
            ]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator color={s.text} />
            ) : (
                <Text style={[styles.text, { color: s.text }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});
