import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, fontSize } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface LoadingSpinnerProps {
    message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
    const { colors } = useThemeStore();

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    message: {
        fontSize: fontSize.md,
        marginTop: spacing.md,
    },
});
