import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, borderRadius } from '../constants/theme';

type StatusType = 'ACTIVE' | 'INACTIVE' | 'CRITICAL' | 'NORMAL' | 'WARNING';

interface StatusBadgeProps {
    status: StatusType;
    label?: string;
}

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
    ACTIVE: { bg: '#E8F5E9', text: '#2E7D32' },
    NORMAL: { bg: '#E8F5E9', text: '#2E7D32' },
    INACTIVE: { bg: '#F5F5F5', text: '#757575' },
    CRITICAL: { bg: '#FFEBEE', text: '#C62828' },
    WARNING: { bg: '#FFF3E0', text: '#E65100' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
    const colorConfig = STATUS_COLORS[status];

    return (
        <View style={[styles.badge, { backgroundColor: colorConfig.bg }]}>
            <Text style={[styles.text, { color: colorConfig.text }]}>
                {label || status}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
});
