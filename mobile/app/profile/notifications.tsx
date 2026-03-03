import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';

export default function NotificationsScreen() {
    const router = useRouter();
    const { colors } = useThemeStore();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [trainingReminder, setTrainingReminder] = useState(true);
    const [healthReminder, setHealthReminder] = useState(true);
    const [abnormalAlert, setAbnormalAlert] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(false);

    const toggleItems = [
        { label: 'Thông báo đẩy', desc: 'Nhận thông báo trên điện thoại', value: pushEnabled, onToggle: setPushEnabled },
        { label: 'Nhắc lịch huấn luyện', desc: 'Nhắc nhở trước buổi huấn luyện 30 phút', value: trainingReminder, onToggle: setTrainingReminder },
        { label: 'Nhắc lịch khám sức khỏe', desc: 'Nhắc nhở trước ngày khám 1 ngày', value: healthReminder, onToggle: setHealthReminder },
        { label: 'Cảnh báo bất thường', desc: 'Thông báo khi phát hiện dấu hiệu bất thường', value: abnormalAlert, onToggle: setAbnormalAlert },
        { label: 'Âm thanh thông báo', desc: 'Phát âm thanh khi có thông báo mới', value: soundEnabled, onToggle: setSoundEnabled },
    ];

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Cài đặt thông báo</Text>
                <View style={{ width: 22 }} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {toggleItems.map((item, index) => (
                    <View key={item.label} style={[styles.row, index < toggleItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                        </View>
                        <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                            thumbColor={item.value ? colors.primary : colors.textLight}
                        />
                    </View>
                ))}
            </View>
            <Text style={[styles.note, { color: colors.textLight }]}>
                Lưu ý: Bạn cần cho phép thông báo trong cài đặt hệ thống của thiết bị để nhận thông báo đẩy.
            </Text>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
    backBtn: { padding: spacing.xs },
    headerTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    card: { borderRadius: borderRadius.lg, overflow: 'hidden', elevation: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
    rowText: { flex: 1, marginRight: spacing.md },
    rowLabel: { fontSize: fontSize.md, fontWeight: '600' },
    rowDesc: { fontSize: fontSize.sm, marginTop: 2 },
    note: { fontSize: fontSize.sm, marginTop: spacing.lg, lineHeight: 20, textAlign: 'center' },
});
