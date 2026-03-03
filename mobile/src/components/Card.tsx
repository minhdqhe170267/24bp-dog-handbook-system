import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface CardProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, onPress, style }) => {
    const { colors } = useThemeStore();

    const cardStyle = [styles.card, { backgroundColor: colors.surface }, style];

    if (onPress) {
        return (
            <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
});
