import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { spacing, fontSize } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface EmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
    actionTitle?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'alert-circle-outline',
    title,
    message,
    actionTitle,
    onAction,
}) => {
    const { colors } = useThemeStore();

    return (
        <View style={styles.container}>
            <Ionicons name={icon as any} size={64} color={colors.textLight} />
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
            {actionTitle && onAction && (
                <View style={styles.action}>
                    <Button title={actionTitle} onPress={onAction} variant="outline" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        marginTop: spacing.md,
    },
    message: {
        fontSize: fontSize.md,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    action: {
        marginTop: spacing.lg,
    },
});
