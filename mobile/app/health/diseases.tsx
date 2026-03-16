import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { SearchBar } from '../../src/components/SearchBar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { diseaseService } from '../../src/services/diseaseService';
import { Disease } from '../../src/types/disease';
import { useThemeStore } from '../../src/stores/themeStore';

const SEVERITY_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'LOW', label: 'Thấp' },
    { key: 'MEDIUM', label: 'Trung bình' },
    { key: 'HIGH', label: 'Cao' },
    { key: 'CRITICAL', label: 'Nguy hiểm' },
];

const SEVERITY_CONFIG: Record<string, { bg: string; bgDark: string; text: string; textDark: string; icon: string; iconColor: string }> = {
    LOW: { bg: '#E8F5E9', bgDark: '#1B4332', text: '#2E7D32', textDark: '#66BB6A', icon: 'shield-checkmark', iconColor: '#2E7D32' },
    MEDIUM: { bg: '#FFF3E0', bgDark: '#4E2600', text: '#E67E22', textDark: '#FFA726', icon: 'alert-circle', iconColor: '#E67E22' },
    HIGH: { bg: '#FFEBEE', bgDark: '#4A0E0E', text: '#D32F2F', textDark: '#EF5350', icon: 'warning', iconColor: '#D32F2F' },
    CRITICAL: { bg: '#F3E5F5', bgDark: '#3A0A4A', text: '#7B1FA2', textDark: '#CE93D8', icon: 'skull', iconColor: '#7B1FA2' },
};

export default function DiseaseListScreen() {
    const [diseases, setDiseases] = useState<Disease[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await diseaseService.getAll();
                setDiseases(data?.content || data || []);
            } catch (error) {
                console.log('Error fetching diseases:', error);
                setDiseases([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = diseases.filter((item) => {
        const matchSearch =
            item.diseaseName?.toLowerCase().includes(search.toLowerCase()) ||
            item.symptomSummary?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = activeFilter === 'all' || item.severityLevel === activeFilter;
        return matchSearch && matchFilter;
    });

    const getSeverity = (level: string) => {
        const cfg = SEVERITY_CONFIG[level] || SEVERITY_CONFIG.MEDIUM;
        return {
            bg: isDark ? cfg.bgDark : cfg.bg,
            text: isDark ? cfg.textDark : cfg.text,
            icon: cfg.icon,
            iconColor: isDark ? cfg.textDark : cfg.iconColor,
        };
    };

    const renderHeader = () => (
        <View>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Bệnh thường gặp</Text>
                <View style={styles.backBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textLight} />
                </View>
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm kiếm bệnh..." />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {SEVERITY_FILTERS.map((f) => (
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
                <LoadingSpinner message="Đang tải danh sách bệnh..." />
            </ScreenWrapper>
        );
    }

    if (filtered.length === 0) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <EmptyState
                    title="Không tìm thấy"
                    message="Không có bệnh nào phù hợp với tìm kiếm"
                    icon="medkit-outline"
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.diseaseId)}
                ListHeaderComponent={renderHeader}
                ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                renderItem={({ item }) => {
                    const sev = getSeverity(item.severityLevel);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push(`/health/diseases/${item.diseaseId}` as any)}
                            style={[styles.card, { backgroundColor: colors.surface }]}
                        >
                            {/* Avatar */}
                            <View style={[styles.avatar, { backgroundColor: sev.bg }]}>
                                <Ionicons name={sev.icon as any} size={24} color={sev.iconColor} />
                            </View>

                            {/* Content */}
                            <View style={styles.cardContent}>
                                <View style={styles.nameRow}>
                                    <Text style={[styles.diseaseName, { color: colors.text }]} numberOfLines={1}>
                                        {item.diseaseName}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                                </View>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                                        <Text style={[styles.severityText, { color: sev.text }]}>
                                            {item.severityLevel}
                                        </Text>
                                    </View>
                                    {item.isContagious && (
                                        <View style={styles.contagiousBadge}>
                                            <Ionicons name="warning" size={10} color="#D32F2F" />
                                            <Text style={styles.contagiousText}>LÂY NHIỄM</Text>
                                        </View>
                                    )}
                                </View>
                                {item.symptomSummary && (
                                    <Text style={[styles.symptomPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                                        Triệu chứng: {item.symptomSummary}
                                    </Text>
                                )}
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
    title: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    filterScroll: { marginTop: spacing.sm, marginBottom: spacing.lg },
    filterContainer: { gap: spacing.sm, paddingRight: spacing.md },
    filterChip: { paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
    filterText: { fontSize: fontSize.md, fontWeight: '500' },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 16,
        padding: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    cardContent: { flex: 1, marginLeft: spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    diseaseName: { fontSize: fontSize.lg, fontWeight: 'bold', flex: 1, marginRight: spacing.sm },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
    severityBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: borderRadius.sm },
    severityText: { fontSize: fontSize.xs, fontWeight: '800', textTransform: 'uppercase' },
    contagiousBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
        backgroundColor: '#FFEBEE',
    },
    contagiousText: { fontSize: fontSize.xs, fontWeight: '700', color: '#D32F2F' },
    symptomPreview: { fontSize: fontSize.sm, lineHeight: 18, marginTop: 6 },
});
