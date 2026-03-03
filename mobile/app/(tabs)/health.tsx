import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';

export default function HealthScreen() {
    const { colors } = useThemeStore();
    return (
        <ScreenWrapper>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="medkit-outline" size={64} color={colors.textLight} />
                <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text, marginTop: spacing.md }}>Sức khỏe</Text>
                <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm }}>Chức năng đang phát triển</Text>
            </View>
        </ScreenWrapper>
    );
}
