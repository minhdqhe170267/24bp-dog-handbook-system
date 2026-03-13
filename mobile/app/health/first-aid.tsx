import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { SearchBar } from '../../src/components/SearchBar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { firstAidService } from '../../src/services/firstAidService';
import { FirstAidGuide } from '../../src/types/firstAid';
import { useThemeStore } from '../../src/stores/themeStore';

const CATEGORY_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Ngộ độc', label: 'Ngộ độc' },
    { key: 'Chấn thương', label: 'Chấn thương' },
    { key: 'Hô hấp', label: 'Hô hấp' },
];

const CATEGORY_CONFIG: Record<string, { bg: string; bgDark: string; text: string; textDark: string; icon: string; border: string }> = {
    'Ngộ độc': { bg: '#FFEBEE', bgDark: '#4A0E0E40', text: '#D32F2F', textDark: '#EF5350', icon: 'skull', border: '#D32F2F' },
    'Chấn thương': { bg: '#FFF3E0', bgDark: '#4E260040', text: '#E67E22', textDark: '#FFA726', icon: 'bandage', border: '#E67E22' },
    'Cấp cứu': { bg: '#FFEBEE', bgDark: '#4A0E0E40', text: '#C62828', textDark: '#EF5350', icon: 'heart-half', border: '#C62828' },
    'Hô hấp': { bg: '#E3F2FD', bgDark: '#0D3B6640', text: '#2980B9', textDark: '#64B5F6', icon: 'fitness', border: '#2980B9' },
    'Môi trường': { bg: '#E8F5E9', bgDark: '#1B433240', text: '#2E7D32', textDark: '#66BB6A', icon: 'leaf', border: '#2E7D32' },
    'default': { bg: '#F5F5F5', bgDark: '#33333340', text: '#757575', textDark: '#BDBDBD', icon: 'medkit', border: '#757575' },
};

const getCategory = (emergencyType: string) => {
    for (const key of Object.keys(CATEGORY_CONFIG)) {
        if (key !== 'default' && emergencyType?.toLowerCase().includes(key.toLowerCase())) {
            return { ...CATEGORY_CONFIG[key], label: key };
        }
    }
    return { ...CATEGORY_CONFIG['default'], label: emergencyType || 'Sơ cứu' };
};

export default function FirstAidListScreen() {
    const [guides, setGuides] = useState<FirstAidGuide[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await firstAidService.getAll();
                setGuides(data?.content || data || []);
            } catch (error) {
                console.log('Error fetching first aid guides:', error);
                setGuides([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = guides.filter((item) => {
        const matchSearch =
            item.guideTitle?.toLowerCase().includes(search.toLowerCase()) ||
            item.emergencyType?.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            activeFilter === 'all' ||
            item.emergencyType?.toLowerCase().includes(activeFilter.toLowerCase());
        return matchSearch && matchFilter;
    });

    const renderHeader = () => (
        <View>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]}>Sơ cứu khẩn cấp</Text>
                    <Text style={{ fontSize: 18 }}>🚨</Text>
                </View>
                <View style={styles.backBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textLight} />
                </View>
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm kiếm cách sơ cứu..." />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {CATEGORY_FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setActiveFilter(f.key)}
                        style={[
                            styles.filterChip,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            activeFilter === f.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                { color: colors.textSecondary },
                                activeFilter === f.key && { color: colors.white },
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    if (loading) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <LoadingSpinner message="Đang tải hướng dẫn sơ cứu..." />
            </ScreenWrapper>
        );
    }

    if (filtered.length === 0) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <EmptyState
                    title="Không tìm thấy"
                    message="Không có hướng dẫn sơ cứu phù hợp"
                    icon="medkit-outline"
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.guideId)}
                ListHeaderComponent={renderHeader}
                ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                renderItem={({ item }) => {
                    const cat = getCategory(item.emergencyType);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push(`/health/first-aid/${item.guideId}` as any)}
                            style={[
                                styles.card,
                                { backgroundColor: colors.surface, borderLeftColor: cat.border },
                            ]}
                        >
                            {/* Category badge */}
                            <View style={[styles.catBadge, { backgroundColor: isDark ? cat.bgDark : cat.bg }]}>
                                <Text style={[styles.catBadgeText, { color: isDark ? cat.textDark : cat.text }]}>
                                    {cat.label.toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.cardRow}>
                                {/* Avatar */}
                                <View style={[styles.avatar, { backgroundColor: isDark ? cat.bgDark : cat.bg }]}>
                                    <Ionicons name={cat.icon as any} size={22} color={isDark ? cat.textDark : cat.text} />
                                </View>

                                {/* Content */}
                                <View style={styles.cardContent}>
                                    <Text style={[styles.guideName, { color: colors.text }]} numberOfLines={1}>
                                        {item.guideTitle}
                                    </Text>
                                    {item.description && (
                                        <Text style={[styles.guideDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {item.description}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    title: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    filterScroll: { marginTop: spacing.sm, marginBottom: spacing.lg },
    filterContainer: { gap: spacing.sm, paddingRight: spacing.md },
    filterChip: { paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
    filterText: { fontSize: fontSize.md, fontWeight: '500' },
    card: {
        borderRadius: 16,
        padding: spacing.md,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    catBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: borderRadius.sm, marginBottom: spacing.sm },
    catBadgeText: { fontSize: fontSize.xs - 1, fontWeight: '800', letterSpacing: 0.5 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: { flex: 1, marginLeft: spacing.md },
    guideName: { fontSize: fontSize.lg, fontWeight: 'bold' },
    guideDesc: { fontSize: fontSize.sm, marginTop: 4 },
});
