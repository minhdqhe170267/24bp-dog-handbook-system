import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { nutritionService } from '../../src/services/nutritionService';
import { NutritionStandard } from '../../src/types/nutrition';
import { useThemeStore } from '../../src/stores/themeStore';

const ACTIVITY_LABEL: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    VERY_HIGH: 'Rất cao',
};

export default function NutritionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [standard, setStandard] = useState<NutritionStandard | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await nutritionService.getById(Number(id));
                setStandard(data);
            } catch (error) {
                console.log('Error fetching nutrition detail:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    if (loading) {
        return (
            <ScreenWrapper>
                <LoadingSpinner message="Đang tải..." />
            </ScreenWrapper>
        );
    }

    if (!standard) {
        return (
            <ScreenWrapper>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>Không tìm thấy khẩu phần</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, marginTop: spacing.md }}>← Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const getAgeRange = () => {
        if (standard.targetAgeMinMonths && standard.targetAgeMaxMonths)
            return `${standard.targetAgeMinMonths}–${standard.targetAgeMaxMonths} tháng`;
        if (standard.targetAgeMinMonths) return `Từ ${standard.targetAgeMinMonths} tháng`;
        if (standard.targetAgeMaxMonths) return `Đến ${standard.targetAgeMaxMonths} tháng`;
        return 'Mọi lứa tuổi';
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Top Header Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: colors.text }]}>Chi tiết dinh dưỡng</Text>
                    <View style={styles.topBarBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textLight} />
                    </View>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
                    {/* Avatar with green ring */}
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
                            <View style={[styles.avatarInner, { backgroundColor: isDark ? '#2D6A4F20' : '#E8F5E9' }]}>
                                <Ionicons name="paw" size={44} color={colors.primary} />
                            </View>
                        </View>
                        {/* Activity badge overlay */}
                        <View style={[styles.activityOverlay, { backgroundColor: colors.accent }]}>
                            <Text style={styles.activityOverlayText}>
                                {ACTIVITY_LABEL[standard.activityLevel]?.toUpperCase() || standard.activityLevel}
                            </Text>
                        </View>
                    </View>

                    {/* Name & Code */}
                    <Text style={[styles.profileName, { color: colors.text }]}>{standard.rationName}</Text>
                    <Text style={[styles.profileCode, { color: colors.textSecondary }]}>{standard.rationCode}</Text>
                    {standard.breedName && (
                        <Text style={[styles.profileBreed, { color: colors.textSecondary }]}>{standard.breedName}</Text>
                    )}

                    {/* 2x2 Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#1B433220' : '#E8F5E9' }]}>
                                <Ionicons name="paw" size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>GIỐNG LOÀI</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {standard.breedName || 'Chung'}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#0D3B6620' : '#E3F2FD' }]}>
                                <Ionicons name="calendar" size={18} color="#2980B9" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>ĐỘ TUỔI</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {getAgeRange()}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#4E260020' : '#FFF3E0' }]}>
                                <Ionicons name="flash" size={18} color="#E67E22" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>MỨC VẬN ĐỘNG</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {ACTIVITY_LABEL[standard.activityLevel] || standard.activityLevel}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#4A0E0E20' : '#FFEBEE' }]}>
                                <Ionicons name="heart" size={18} color="#E74C3C" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>TÌNH TRẠNG</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {standard.healthCondition || 'Khỏe mạnh'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {standard.description && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionTitleRow}>
                            <View style={[styles.sectionAccent, { backgroundColor: colors.accent }]} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mô tả chế độ</Text>
                        </View>
                        <Text style={[styles.descText, { color: colors.textSecondary }]}>
                            {standard.description}
                        </Text>
                    </View>
                )}

                {/* Special Notes */}
                {standard.specialNotes && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ghi chú đặc biệt</Text>
                        <View style={[styles.noteBox, { backgroundColor: isDark ? '#4E260030' : '#FFF8E1' }]}>
                            <Ionicons name="alert-circle" size={18} color="#F9A825" />
                            <Text style={[styles.noteText, { color: isDark ? '#FFA726' : '#F57C00' }]}>
                                {standard.specialNotes}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Metadata */}
                {standard.metadata && (() => {
                    try {
                        const meta = typeof standard.metadata === 'string' ? JSON.parse(standard.metadata) : standard.metadata;
                        return (
                            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin bổ sung</Text>

                                {/* Daily Calories */}
                                {meta.daily_calories && (
                                    <View style={[styles.metaCalorie, { backgroundColor: isDark ? colors.primaryLight + '20' : '#E8F5E9' }]}>
                                        <Ionicons name="flame" size={22} color={colors.primary} />
                                        <View>
                                            <Text style={[styles.metaCalorieValue, { color: colors.primary }]}>
                                                {meta.daily_calories.toLocaleString()} Kcal/ngày
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Macros */}
                                {(meta.protein_g || meta.fat_g || meta.carb_g) && (
                                    <View style={styles.metaMacros}>
                                        {meta.protein_g != null && (
                                            <View style={[styles.macroItem, { backgroundColor: isDark ? '#1B433220' : '#E8F5E9' }]}>
                                                <Text style={[styles.macroValue, { color: '#2E7D32' }]}>{meta.protein_g}g</Text>
                                                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
                                            </View>
                                        )}
                                        {meta.fat_g != null && (
                                            <View style={[styles.macroItem, { backgroundColor: isDark ? '#4E260020' : '#FFF3E0' }]}>
                                                <Text style={[styles.macroValue, { color: '#E67E22' }]}>{meta.fat_g}g</Text>
                                                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Chất béo</Text>
                                            </View>
                                        )}
                                        {meta.carb_g != null && (
                                            <View style={[styles.macroItem, { backgroundColor: isDark ? '#0D3B6620' : '#E3F2FD' }]}>
                                                <Text style={[styles.macroValue, { color: '#2980B9' }]}>{meta.carb_g}g</Text>
                                                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carb</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Ingredients */}
                                {meta.ingredients && Array.isArray(meta.ingredients) && meta.ingredients.length > 0 && (
                                    <View style={{ marginTop: spacing.md }}>
                                        <Text style={[styles.metaSubTitle, { color: colors.text }]}>Thành phần</Text>
                                        {meta.ingredients.map((ing: any, idx: number) => (
                                            <View key={idx} style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
                                                <View style={styles.ingredientLeft}>
                                                    <Ionicons name="ellipse" size={6} color={colors.accent} />
                                                    <Text style={[styles.ingredientName, { color: colors.text }]}>{ing.item}</Text>
                                                </View>
                                                <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>{ing.amount}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Feeding Schedule */}
                                {meta.feeding_schedule && (
                                    <View style={{ marginTop: spacing.md }}>
                                        <Text style={[styles.metaSubTitle, { color: colors.text }]}>Lịch cho ăn</Text>
                                        {(() => {
                                            // Parse "07:00 300g, 12:00 200g, 17:00 300g"
                                            const MEAL_CONFIG = [
                                                { label: 'Sáng', icon: 'sunny' as const, color: '#E67E22', gradientBg: '#FFF3E0' },
                                                { label: 'Trưa', icon: 'partly-sunny' as const, color: '#2980B9', gradientBg: '#E3F2FD' },
                                                { label: 'Chiều', icon: 'cloudy' as const, color: '#7B1FA2', gradientBg: '#F3E5F5' },
                                                { label: 'Tối', icon: 'moon' as const, color: '#1B4332', gradientBg: '#E8F5E9' },
                                            ];
                                            const parts = String(meta.feeding_schedule).split(',').map((s: string) => s.trim()).filter(Boolean);
                                            const meals = parts.map((part: string, idx: number) => {
                                                const match = part.match(/(\d{1,2}:\d{2})\s*(.*)/);
                                                const config = MEAL_CONFIG[idx % MEAL_CONFIG.length];
                                                return {
                                                    time: match ? match[1] : part,
                                                    portion: match ? match[2] : '',
                                                    ...config,
                                                };
                                            });

                                            return (
                                                <View style={styles.mealTimeline}>
                                                    {meals.map((meal, idx) => (
                                                        <View
                                                            key={idx}
                                                            style={[styles.mealRow, { backgroundColor: isDark ? meal.color + '15' : meal.gradientBg }]}
                                                        >
                                                            <View style={[styles.mealTimeCircle, { backgroundColor: meal.color }]}>
                                                                <Ionicons name={meal.icon} size={16} color="#FFFFFF" />
                                                            </View>
                                                            <View style={styles.mealInfo}>
                                                                <Text style={[styles.mealLabel, { color: colors.text }]}>{meal.label}</Text>
                                                                <Text style={[styles.mealTimeText, { color: colors.textSecondary }]}>{meal.time}</Text>
                                                            </View>
                                                            {meal.portion ? (
                                                                <View style={[styles.portionBadge, { backgroundColor: meal.color + '20' }]}>
                                                                    <Text style={[styles.portionText, { color: meal.color }]}>{meal.portion}</Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    ))}
                                                </View>
                                            );
                                        })()}
                                    </View>
                                )}
                            </View>
                        );
                    } catch {
                        // Fallback: hiển thị text nếu không parse được JSON
                        return (
                            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin bổ sung</Text>
                                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                                    {standard.metadata}
                                </Text>
                            </View>
                        );
                    }
                })()}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Calculator Button */}
            <TouchableOpacity
                style={[styles.fabButton, { backgroundColor: colors.accent }]}
                activeOpacity={0.85}
                onPress={() => router.push('/nutrition/calculator' as any)}
            >
                <Ionicons name="calculator" size={20} color="#FFFFFF" />
                <Text style={styles.fabText}>Tính khẩu phần</Text>
            </TouchableOpacity>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, marginTop: spacing.xs },
    topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    topBarTitle: { fontSize: fontSize.lg, fontWeight: '600' },
    profileCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.xl,
        marginTop: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    avatarContainer: { alignItems: 'center', marginBottom: spacing.lg },
    avatarRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    avatarInner: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
    activityOverlay: {
        position: 'absolute',
        bottom: -6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    activityOverlayText: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
    profileName: { fontSize: fontSize.xxl, fontWeight: 'bold', textAlign: 'center', marginTop: spacing.xs },
    profileCode: { fontSize: fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
    profileBreed: { fontSize: fontSize.md, marginTop: spacing.xs, textAlign: 'center' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
    infoCard: { width: '48%', flexGrow: 1, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
    infoCardIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
    infoCardLabel: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    infoCardValue: { fontSize: fontSize.md, fontWeight: '700', textAlign: 'center' },
    section: {
        marginTop: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    sectionAccent: { width: 4, height: 20, borderRadius: 2 },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    descText: { fontSize: fontSize.md, lineHeight: 22 },
    noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md },
    noteText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
    metaCalorie: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg },
    metaCalorieValue: { fontSize: fontSize.xxl, fontWeight: 'bold' },
    metaMacros: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    macroItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md },
    macroValue: { fontSize: fontSize.xl, fontWeight: 'bold' },
    macroLabel: { fontSize: fontSize.xs, marginTop: 2 },
    metaSubTitle: { fontSize: fontSize.md, fontWeight: '600', marginBottom: spacing.sm },
    ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1 },
    ingredientLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    ingredientName: { fontSize: fontSize.md },
    ingredientAmount: { fontSize: fontSize.md, fontWeight: '500' },
    scheduleBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md },
    scheduleText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
    mealTimeline: { gap: spacing.sm },
    mealRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg },
    mealTimeCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    mealInfo: { flex: 1, marginLeft: spacing.md },
    mealLabel: { fontSize: fontSize.md, fontWeight: '700' },
    mealTimeText: { fontSize: fontSize.sm, marginTop: 2 },
    portionBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
    portionText: { fontSize: fontSize.sm, fontWeight: '700' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    errorText: { fontSize: fontSize.lg, marginTop: spacing.md },
    fabButton: {
        position: 'absolute',
        bottom: spacing.lg,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    fabText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: 'bold' },
});
