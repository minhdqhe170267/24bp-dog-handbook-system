import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { SearchBar } from '../../src/components/SearchBar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { medicationService } from '../../src/services/medicationService';
import { Medication } from '../../src/types/medication';
import { useThemeStore } from '../../src/stores/themeStore';

const TYPE_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Kháng sinh', label: 'Kháng sinh' },
    { key: 'Vaccine', label: 'Vaccine' },
    { key: 'Tẩy giun', label: 'Tẩy giun' },
];

const METHOD_CONFIG: Record<string, { bg: string; bgDark: string; text: string; icon: string }> = {
    'Uống': { bg: '#E3F2FD', bgDark: '#0D3B6640', text: '#1565C0', icon: 'water' },
    'Tiêm': { bg: '#FCE4EC', bgDark: '#4A0E0E40', text: '#C62828', icon: 'medkit' },
    'Bôi': { bg: '#FFF3E0', bgDark: '#4E260040', text: '#E65100', icon: 'color-fill' },
    'Nhỏ': { bg: '#E8F5E9', bgDark: '#1B433240', text: '#2E7D32', icon: 'eyedrop' },
    'default': { bg: '#F5F5F5', bgDark: '#33333340', text: '#757575', icon: 'medical' },
};

const getMethod = (method: string | undefined) => {
    if (!method) return METHOD_CONFIG['default'];
    for (const key of Object.keys(METHOD_CONFIG)) {
        if (key !== 'default' && method.toLowerCase().includes(key.toLowerCase())) {
            return METHOD_CONFIG[key];
        }
    }
    return METHOD_CONFIG['default'];
};

const PILL_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

export default function MedicationListScreen() {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await medicationService.getAll();
                setMedications(data?.content || data || []);
            } catch (error) {
                console.log('Error fetching medications:', error);
                setMedications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = medications.filter((item) => {
        const matchSearch =
            item.medicationName?.toLowerCase().includes(search.toLowerCase()) ||
            item.description?.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            activeFilter === 'all' ||
            item.description?.toLowerCase().includes(activeFilter.toLowerCase()) ||
            item.administrationMethod?.toLowerCase().includes(activeFilter.toLowerCase());
        return matchSearch && matchFilter;
    });

    const renderHeader = () => (
        <View>
            {/* Top Bar */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Thuốc & Điều trị</Text>
                <TouchableOpacity style={styles.backBtn}>
                    <Ionicons name="options-outline" size={20} color={colors.textLight} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm kiếm thuốc hoặc triệu chứng..." />

            {/* Filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {TYPE_FILTERS.map((f) => (
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
                <LoadingSpinner message="Đang tải danh sách thuốc..." />
            </ScreenWrapper>
        );
    }

    if (filtered.length === 0) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <EmptyState
                    title="Không tìm thấy"
                    message="Không có thuốc nào phù hợp với tìm kiếm"
                    icon="medical-outline"
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.medicationId)}
                ListHeaderComponent={renderHeader}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
                renderItem={({ item, index }) => {
                    const method = getMethod(item.administrationMethod);
                    const pillColor = PILL_COLORS[index % PILL_COLORS.length];
                    return (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push(`/health/medications/${item.medicationId}` as any)}
                            style={[styles.card, { backgroundColor: colors.surface }]}
                        >
                            {/* Pill Icon */}
                            <View style={[styles.pillIcon, { backgroundColor: pillColor + '18' }]}>
                                <Ionicons name="medical" size={24} color={pillColor} />
                            </View>

                            {/* Content */}
                            <View style={styles.cardContent}>
                                <Text style={[styles.medName, { color: colors.text }]} numberOfLines={1}>
                                    {item.medicationName}
                                </Text>
                                {item.description && (
                                    <Text style={[styles.medDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.description}
                                    </Text>
                                )}
                                <View style={styles.badgeRow}>
                                    {/* Method badge */}
                                    <View style={[styles.methodBadge, { backgroundColor: isDark ? method.bgDark : method.bg }]}>
                                        <Ionicons name={method.icon as any} size={11} color={method.text} />
                                        <Text style={[styles.methodText, { color: method.text }]}>
                                            {item.administrationMethod || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Chevron */}
                            <View style={styles.chevronBox}>
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
    title: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    filterScroll: { marginTop: spacing.sm, marginBottom: spacing.lg },
    filterContainer: { gap: spacing.sm, paddingRight: spacing.md },
    filterChip: { paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
    filterText: { fontSize: fontSize.md, fontWeight: '500' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    pillIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: { flex: 1, marginLeft: spacing.md },
    medName: { fontSize: fontSize.lg, fontWeight: 'bold' },
    medDesc: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 18 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
    methodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    methodText: { fontSize: 11, fontWeight: '700' },
    chevronBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
