import React, { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { spacing } from '../../src/constants/theme';
import { useThemeStore } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { dogManagementUi } from '../../src/features/dog-management/ui';

type HomeAction = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  message?: string;
};

const homeActions: HomeAction[] = [
  { id: 'training', title: 'Huấn luyện', icon: 'flag', route: '/(tabs)/training' },
  { id: 'dog-hub', title: 'Hồ sơ chó', icon: 'paw', route: '/dog-management' },
  { id: 'health', title: 'Sức khỏe', icon: 'medkit', route: '/(tabs)/health' },
  { id: 'nutrition', title: 'Dinh dưỡng', icon: 'restaurant', route: '/(tabs)/nutrition' },
  { id: 'reports', title: 'Báo cáo', icon: 'bar-chart', message: 'Màn báo cáo sẽ được bổ sung ở bước tiếp theo.' },
  { id: 'breeds', title: 'Giống chó', icon: 'search', route: '/(tabs)/breeds' },
];

const fonts = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeStore();
  const { user } = useAuthStore();
  const [searchText, setSearchText] = useState('');

  const onPressAction = (item: HomeAction) => {
    if (item.route) {
      router.push(item.route as any);
      return;
    }
    Alert.alert('Thông báo', item.message || 'Chức năng đang phát triển.');
  };

  return (
    <ScreenWrapper scrollable style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
      <View style={styles.headerRow}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.helloText, { fontFamily: fonts.medium }]}>Xin chào,</Text>
            <Text style={[styles.nameText, { fontFamily: fonts.bold }]}>
              Đồng chí {user?.fullName || 'Huấn luyện viên'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifyBtn} activeOpacity={0.85}>
          <Ionicons name="notifications" size={16} color="#6B7C71" />
          <View style={styles.notifyDot} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surface : '#F1F4F2' }]}>
        <Ionicons name="search" size={15} color="#8A9C90" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm kiếm dữ liệu..."
          placeholderTextColor="#8A9C90"
          style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.medium }]}
        />
      </View>

      <Text style={[styles.mainTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
        Truy cập nhanh
      </Text>

      <View style={styles.actionGrid}>
        {homeActions.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.88}
            style={[
              styles.actionCard,
              {
                backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                borderColor: isDark ? colors.border : dogManagementUi.border,
              },
            ]}
            onPress={() => onPressAction(item)}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name={item.icon} size={18} color="#2E5A46" />
            </View>
            <Text style={[styles.actionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: fonts.bold }]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.emergencyBtn}
        onPress={() => router.push('/health/first-aid')}
      >
        <View style={styles.emergencyLeftBadge}>
          <Ionicons name="medical" size={14} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyTextWrap}>
          <Text style={[styles.emergencyTitle, { fontFamily: fonts.bold }]}>SƠ CỨU KHẨN CẤP</Text>
          <Text style={[styles.emergencySub, { fontFamily: fonts.medium }]}>Hướng dẫn xử lý nhanh khi gặp sự cố</Text>
        </View>
        <Ionicons style={styles.emergencyChevron} name="chevron-forward" size={17} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F5A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#7D8F84',
    fontWeight: '600',
  },
  nameText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#153326',
    fontWeight: '800',
  },
  notifyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2EF',
  },
  notifyDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5F5F',
  },
  searchBar: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  mainTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  actionGrid: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  actionCard: {
    width: '48.5%',
    minHeight: 108,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D2318',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EFEB',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  emergencyBtn: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    alignSelf: 'center',
    width: '92%',
    maxWidth: 380,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: '#1D563B',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#2B6A4C',
    shadowColor: '#0D2318',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  emergencyLeftBadge: {
    position: 'absolute',
    left: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E6E50',
  },
  emergencyTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emergencyChevron: {
    position: 'absolute',
    right: 16,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emergencySub: {
    color: '#D8EADF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
