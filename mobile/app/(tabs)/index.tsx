import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { Card } from '../../src/components/Card';
import { spacing, fontSize } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';

const modules = [
  { id: '1', icon: 'paw', label: 'Giống chó', bgColor: '#E8F5E9', iconColor: '#1B4332', route: '/(tabs)/breeds' },
  { id: '2', icon: 'restaurant', label: 'Dinh dưỡng', bgColor: '#FFF3E0', iconColor: '#E67E22', route: null },
  { id: '3', icon: 'fitness', label: 'Huấn luyện', bgColor: '#E3F2FD', iconColor: '#2980B9', route: '/(tabs)/training' },
  { id: '4', icon: 'medkit', label: 'Sức khỏe', bgColor: '#FFEBEE', iconColor: '#E74C3C', route: '/(tabs)/health' },
  { id: '5', icon: 'document-text', label: 'Ghi chú', bgColor: '#F3E5F5', iconColor: '#8E44AD', route: null },
  { id: '6', icon: 'stats-chart', label: 'Báo cáo', bgColor: '#E0F2F1', iconColor: '#16A085', route: null },
];

const stats = [
  { label: 'Chó đang quản lý', value: '3' },
  { label: 'Ghi chú tháng này', value: '15' },
  { label: 'Báo cáo chờ duyệt', value: '2' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { colors, isDark } = useThemeStore();
  const router = useRouter();

  const handleModulePress = (item: typeof modules[0]) => {
    if (item.route) {
      router.push(item.route as any);
    } else {
      Alert.alert('Thông báo', 'Chức năng đang phát triển');
    }
  };

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Xin chào, {user?.fullName || 'Trainer'}
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Thông báo', 'Chưa có thông báo mới')}
            style={styles.notificationBtn}
          >
            <Ionicons name="notifications-outline" size={26} color={colors.primary} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.error }]} />
          </TouchableOpacity>
        </View>
        {user?.militaryRank && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {user.militaryRank} — {user.unit}
          </Text>
        )}
      </View>

      <FlatList
        data={modules}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.columnWrapper}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.moduleItem}
            activeOpacity={0.7}
            onPress={() => handleModulePress(item)}
          >
            <Card style={styles.moduleCard}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? item.iconColor + '20' : item.bgColor }]}>
                <Ionicons name={item.icon as any} size={28} color={item.iconColor} />
              </View>
              <Text style={[styles.moduleLabel, { color: colors.text }]}>{item.label}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[styles.emergencyBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => Alert.alert('SƠ CỨU KHẨN CẤP', 'Chức năng đang phát triển')}
      >
        <Ionicons name="warning" size={22} color={colors.white} />
        <Text style={styles.emergencyText}>SƠ CỨU KHẨN CẤP</Text>
      </TouchableOpacity>

      <Card style={styles.statsCard}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>Thống kê nhanh</Text>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[styles.statRow, index < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
          </View>
        ))}
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notificationBtn: { position: 'relative', padding: spacing.xs },
  notificationBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  greeting: { fontSize: fontSize.xxl, fontWeight: 'bold' },
  subtitle: { fontSize: fontSize.md, marginTop: spacing.xs },
  columnWrapper: { justifyContent: 'space-between' },
  moduleItem: { width: '48%', marginBottom: spacing.md },
  moduleCard: { alignItems: 'center', paddingVertical: spacing.lg },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  moduleLabel: { fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.sm },
  emergencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  emergencyText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: 'bold', marginLeft: spacing.sm },
  statsCard: { marginTop: spacing.sm },
  statsTitle: { fontSize: fontSize.lg, fontWeight: 'bold', marginBottom: spacing.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  statLabel: { fontSize: fontSize.md },
  statValue: { fontSize: fontSize.md, fontWeight: '600' },
});
