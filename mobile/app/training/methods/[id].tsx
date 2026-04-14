import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { ThemeColors, useThemeStore } from '../../../src/stores/themeStore';
import { spacing, borderRadius, fontSize } from '../../../src/constants/theme';
import { trainingMethodService } from '../../../src/services/trainingMethodService';
import { TrainingMethod } from '../../../src/types/training';
import { normalizeStatus, pickTrainingImage, splitToBullets, statusMeta, trainingUi } from '../../../src/features/training/ui';
import { buildTrainingInstructionSteps, useTrainingEntrance } from '../../../src/features/training/presentation';

const STEP_PREFIX_PATTERN = /^(?:b|b(?:uoc|ước)|step)\s*\d+\s*(?:[:.)-]\s*)?/i;

const parseGuideStep = (raw: string, index: number): { title: string; detail: string } => {
    const cleaned = raw.trim().replace(STEP_PREFIX_PATTERN, '').trim();
    const parts = cleaned.split(/[:\-–]\s+/, 2);

    if (parts.length === 2) {
        const titleCandidate = parts[0].trim();
        const detailCandidate = parts[1].trim();
        const titleIsGenericStep = /^(?:b(?:uoc|ước)?|step)\s*\d+$/i.test(titleCandidate);

        if (!titleIsGenericStep && titleCandidate.length >= 3 && titleCandidate.length <= 40) {
            return {
                title: titleCandidate,
                detail: detailCandidate,
            };
        }
    }

    return {
        title: `Bước ${index + 1}`,
        detail: cleaned,
    };
};

export default function MethodDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    const [method, setMethod] = useState<TrainingMethod | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { animatedStyle } = useTrainingEntrance();

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await trainingMethodService.getById(Number(id));
                setMethod(data);
                setError('');
            } catch (err: any) {
                setError(err?.message || 'Không thể tải chi tiết phương pháp');
                setMethod(null);
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchDetail();
        }
    }, [id]);

    const statusInfo = useMemo(() => {
        const statusKey = normalizeStatus(method?.status);
        return statusMeta[statusKey];
    }, [method?.status]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!method) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={42} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Không tìm thấy phương pháp'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.retryText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const advantages = splitToBullets(method.advantages);
    const disadvantages = splitToBullets(method.disadvantages);
    const guideSteps = buildTrainingInstructionSteps(method.instructions)
        .map((item, idx) => parseGuideStep(`${item.title}: ${item.detail}`, idx))
        .filter((item) => item.detail.length > 0);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : trainingUi.page }}>
            <Animated.ScrollView style={animatedStyle} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={22} color={isDark ? colors.text : trainingUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                        Chi tiết phương pháp
                    </Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
                        <Ionicons name="share-social-outline" size={20} color={isDark ? colors.textLight : trainingUi.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroCard}>
                    <Image source={pickTrainingImage(method.methodId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.heroOverlay} />
                    <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>PHƯƠNG PHÁP HUẤN LUYỆN</Text>
                    </View>
                    <Text style={styles.heroTitle}>{method.methodName}</Text>
                    <Text style={styles.heroSubtitle}>Tăng tính ổn định hành vi trong huấn luyện chó</Text>
                </View>

                <View
                    style={[
                        styles.authorCard,
                        { backgroundColor: isDark ? colors.surface : trainingUi.surface, borderColor: isDark ? colors.border : trainingUi.border },
                    ]}
                >
                    <View style={styles.authorLeft}>
                        <View style={[styles.avatar, { backgroundColor: isDark ? colors.primaryLight : trainingUi.brandSoft }]}>
                            <Ionicons name="person" size={18} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.authorName, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                {method.createdByName || 'Chuyên gia huấn luyện'}
                            </Text>
                            <Text style={[styles.authorRole, { color: isDark ? colors.textSecondary : trainingUi.textMuted }]}>
                                Huấn luyện viên được chứng nhận
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.publishBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.publishBadgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>
                </View>

                <SectionCard title="Giới thiệu" icon="information-circle" colors={colors} isDark={isDark}>
                    <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                        {method.description || 'Chưa có phần giới thiệu cho phương pháp này.'}
                    </Text>
                </SectionCard>

                <View style={styles.metricRow}>
                    <View style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#EDF5F0', borderColor: isDark ? colors.border : trainingUi.border }]}>
                        <Text style={[styles.metricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{advantages.length}</Text>
                        <Text style={[styles.metricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Ưu điểm</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#EDF5F0', borderColor: isDark ? colors.border : trainingUi.border }]}>
                        <Text style={[styles.metricValue, { color: isDark ? colors.text : trainingUi.textStrong }]}>{guideSteps.length}</Text>
                        <Text style={[styles.metricLabel, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>Bước hướng dẫn</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#FFF3E4', borderColor: isDark ? colors.border : '#F0D8A8' }]}>
                        <Text style={[styles.metricValue, { color: isDark ? colors.text : '#7A5008' }]}>{disadvantages.length}</Text>
                        <Text style={[styles.metricLabel, { color: isDark ? colors.textSecondary : '#805814' }]}>Lưu ý</Text>
                    </View>
                </View>

                <SectionCard title="Ưu điểm" icon="checkmark-circle" colors={colors} isDark={isDark}>
                    {advantages.length > 0 ? (
                        advantages.map((item, idx) => (
                            <View key={`${item}-${idx}`} style={styles.listRow}>
                                <Ionicons name="ellipse" size={8} color={colors.primary} />
                                <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>{item}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Chưa có danh sách ưu điểm.
                        </Text>
                    )}
                </SectionCard>

                <SectionCard title="Lưu ý" icon="warning" colors={colors} isDark={isDark} warning>
                    {disadvantages.length > 0 ? (
                        disadvantages.map((item, idx) => (
                            <View key={`${item}-${idx}`} style={styles.listRow}>
                                <Ionicons name="ellipse" size={8} color={colors.warning} />
                                <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#805814' }]}>{item}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : '#805814' }]}>
                            Chưa có lưu ý nào.
                        </Text>
                    )}
                </SectionCard>

                <View style={styles.guideSection}>
                    <View style={styles.guideHeader}>
                        <Ionicons name="list" size={18} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>Hướng dẫn chi tiết</Text>
                    </View>
                    {guideSteps.length > 0 ? (
                        <View style={styles.guideList}>
                            {guideSteps.map((step, idx) => (
                                <View key={`${step.title}-${idx}`} style={styles.guideItem}>
                                    <View style={styles.guideRail}>
                                        <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.stepCircleText}>{idx + 1}</Text>
                                        </View>
                                        {idx < guideSteps.length - 1 ? (
                                            <View
                                                style={[
                                                    styles.guideLine,
                                                    { backgroundColor: isDark ? colors.border : '#D7E4DC' },
                                                ]}
                                            />
                                        ) : null}
                                    </View>
                                    <View style={styles.guideContent}>
                                        <Text style={[styles.guideTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>
                                            {step.title}
                                        </Text>
                                        <Text style={[styles.guideDetail, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                                            {step.detail}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.bodyText, { color: isDark ? colors.textSecondary : trainingUi.textNormal }]}>
                            Chưa có hướng dẫn chi tiết.
                        </Text>
                    )}
                </View>
            </Animated.ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : trainingUi.page }]}>
                <TouchableOpacity
                    style={[styles.bottomButton, { backgroundColor: colors.primary }]}
                    activeOpacity={0.88}
                    onPress={() => router.push('/training/exercises' as any)}
                >
                    <Ionicons name="flash" size={18} color="#FFFFFF" />
                    <Text style={styles.bottomButtonText}>Áp dụng vào bài tập</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

type SectionCardProps = {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    children: React.ReactNode;
    colors: ThemeColors;
    isDark: boolean;
    warning?: boolean;
};

function SectionCard({ title, icon, children, colors, isDark, warning = false }: SectionCardProps) {
    return (
        <View
            style={[
                styles.sectionCard,
                {
                    backgroundColor: isDark ? colors.surface : warning ? trainingUi.warnSoft : trainingUi.surface,
                    borderColor: isDark ? colors.border : trainingUi.border,
                },
            ]}
        >
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={18} color={warning ? colors.warning : colors.primary} />
                <Text style={[styles.sectionTitle, { color: isDark ? colors.text : trainingUi.textStrong }]}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 120,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        fontSize: fontSize.md,
    },
    retryButton: {
        marginTop: spacing.sm,
        minHeight: 44,
        minWidth: 120,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    header: {
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
    },
    heroCard: {
        height: 214,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: spacing.md,
        justifyContent: 'flex-end',
        padding: spacing.md,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 15, 11, 0.42)',
    },
    heroBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(17, 34, 24, 0.7)',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        marginBottom: spacing.xs,
    },
    heroBadgeText: {
        color: '#E4F3EA',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '700',
    },
    heroSubtitle: {
        marginTop: 4,
        color: '#DCEDE3',
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    authorCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    authorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    authorName: {
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    authorRole: {
        marginTop: 2,
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    publishBadge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        minHeight: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    publishBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    metricRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    metricCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    metricLabel: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSize.md + 1,
        fontWeight: '700',
    },
    bodyText: {
        flex: 1,
        fontSize: fontSize.md,
        lineHeight: 21,
        fontWeight: '500',
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    guideSection: {
        marginBottom: spacing.md,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    guideList: {
        gap: spacing.sm,
    },
    guideItem: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    guideRail: {
        width: 30,
        alignItems: 'center',
    },
    guideLine: {
        width: 2,
        flex: 1,
        marginTop: 6,
        borderRadius: 999,
    },
    guideContent: {
        flex: 1,
        paddingBottom: spacing.sm + 2,
    },
    guideTitle: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
    },
    guideDetail: {
        marginTop: 2,
        fontSize: fontSize.md,
        lineHeight: 21,
        fontWeight: '500',
    },
    stepCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepCircleText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    bottomBar: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
    },
    bottomButton: {
        minHeight: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    bottomButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
});
