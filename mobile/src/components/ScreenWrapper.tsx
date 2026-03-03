import React from 'react';
import {
    View,
    ScrollView,
    StatusBar,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

interface ScreenWrapperProps {
    children: React.ReactNode;
    scrollable?: boolean;
    style?: ViewStyle;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    scrollable = false,
    style,
}) => {
    const { colors, isDark } = useThemeStore();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            {scrollable ? (
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, style]}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.content, style]}>{children}</View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.md,
    },
});
