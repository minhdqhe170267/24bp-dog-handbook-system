import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useThemeStore } from '../../../src/stores/themeStore';
import { assignmentService } from '../../../src/services/assignmentService';
import { dogService } from '../../../src/services/dogService';
import { healthRecordService } from '../../../src/services/healthRecordService';
import { DogAssignment, DogProfile, HealthRecord } from '../../../src/types/dogManagement';
import {
    dogManagementUi,
    fallbackAssignments,
    fallbackDogs,
    fallbackHealthRecords,
    formatDate,
    formatDateTime,
    pickDogImage,
    stringifyWeight,
} from '../../../src/features/dog-management/ui';

const normalizePersonName = (value?: string | null) => {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(bac si|bs|doctor|dr|quan y|trung uy|thuong uy|thieu ta|dai uy|chien si)\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const areLikelySamePerson = (left?: string | null, right?: string | null) => {
    const normalizedLeft = normalizePersonName(left);
    const normalizedRight = normalizePersonName(right);
    if (!normalizedLeft || !normalizedRight) {
        return false;
    }
    return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

export default function HealthRecordDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [record, setRecord] = useState<HealthRecord | null>(null);
    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const detail = await healthRecordService.getById(Number(id));
                const [relatedDog, relatedAssignments] = detail.dogId
                    ? await Promise.all([
                        dogService.getById(detail.dogId),
                        assignmentService.getByDog(detail.dogId),
                    ])
                    : [null, []];
                if (!mounted) {
                    return;
                }
                setRecord(detail);
                setDog(relatedDog);
                setAssignment(relatedAssignments.find((item) => item.isActive !== false) || relatedAssignments[0] || null);
            } catch {
                if (mounted) {
                    const fallbackRecord = fallbackHealthRecords.find((item) => String(item.recordId) === String(id)) || fallbackHealthRecords[0];
                    setRecord(fallbackRecord);
                    setDog(fallbackDogs.find((item) => item.dogId === fallbackRecord.dogId) || fallbackDogs[0]);
                    setAssignment(
                        fallbackAssignments.find((item) => item.dogId === fallbackRecord.dogId && item.isActive !== false) ||
                        fallbackAssignments.find((item) => item.dogId === fallbackRecord.dogId) ||
                        null
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            loadData();
        }

        return () => {
            mounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!record) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle-outline" size={38} color={colors.error} />
                    <Text style={[styles.errorText, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        Không tìm thấy hồ sơ khám
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    const samePersonAsTrainer = areLikelySamePerson(record.examinerName, assignment?.trainerName);
    const personnelTitle = samePersonAsTrainer ? 'Người cập nhật hồ sơ' : 'Người khám';
    const personnelName = record.examinerName || 'Chưa có thông tin người ghi nhận';
    const personnelMeta = assignment?.trainerName && !samePersonAsTrainer ? `Chiến sĩ phụ trách: ${assignment.trainerName}` : 'Vai trò được hiển thị theo dữ liệu hiện có.';

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        Chi tiết hồ sơ
                    </Text>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="share-social-outline" size={19} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.heroCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Image source={dog?.imageUrl || pickDogImage(record.dogId)} style={styles.heroImage} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                        <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>ĐÃ GHI NHẬN</Text>
                        </View>
                        <Text style={[styles.heroTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                            Hồ sơ khám sức khỏe
                        </Text>
                        <Text style={[styles.heroMeta, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                            {formatDate(record.examinationDate)}
                        </Text>
                    </View>
                </View>

                <View style={styles.statRow}>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                            },
                        ]}
                    >
                        <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>CÂN NẶNG</Text>
                        <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                            {stringifyWeight(record.weightKg)}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statCard,
                            {
                                backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                                borderColor: isDark ? colors.border : dogManagementUi.border,
                            },
                        ]}
                    >
                        <Text style={[styles.statLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>NHIỆT ĐỘ</Text>
                        <Text style={[styles.statValue, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                            {record.temperatureC ? `${record.temperatureC} °C` : 'Chưa cập nhật'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.examinerCard, { backgroundColor: colors.primary }]}>
                    <Text style={styles.examinerTitle}>{personnelTitle}</Text>
                    <Text style={styles.examinerName}>{personnelName}</Text>
                    <Text style={styles.examinerMeta}>
                        Hồ sơ: {record.dogName || dog?.dogName || 'N/A'} • {record.dogCode || dog?.dogCode || 'N/A'}
                    </Text>
                    <Text style={styles.examinerMeta}>{personnelMeta}</Text>
                    <View style={styles.examinerActions}>
                        <TouchableOpacity
                            style={styles.examinerButton}
                            activeOpacity={0.86}
                            onPress={() => router.push(`/dog-management/dogs/${record.dogId}` as any)}
                        >
                            <Text style={styles.examinerButtonText}>Xem hồ sơ chó</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.examinerButton}
                            activeOpacity={0.86}
                            onPress={() => router.push('/dog-management/assignments' as any)}
                        >
                            <Text style={styles.examinerButtonText}>Xem phân công</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View
                    style={[
                        styles.infoCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        Quan sát lâm sàng
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        • Ăn uống: {record.appetiteLevel || 'Chưa ghi nhận'}
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        • Vận động: {record.activityLevel || 'Chưa ghi nhận'}
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        • Phân: {record.fecesStatus || 'Chưa ghi nhận'}
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        • Triệu chứng: {record.observedSymptoms || 'Không phát hiện bất thường rõ rệt.'}
                    </Text>
                </View>

                <View
                    style={[
                        styles.infoCard,
                        {
                            backgroundColor: isDark ? colors.surface : dogManagementUi.surface,
                            borderColor: isDark ? colors.border : dogManagementUi.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        Chẩn đoán và hướng xử lý
                    </Text>
                    <Text style={[styles.infoTag, { color: '#1D6A43', backgroundColor: '#E8F5ED' }]}>CHẨN ĐOÁN CHÍNH</Text>
                    <Text style={[styles.diagnosisText, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        {record.diagnosis || 'Tình trạng ổn định, kiểm tra định kỳ.'}
                    </Text>

                    <Text style={[styles.infoTag, { color: '#0E5DA8', backgroundColor: '#E3F0FF', marginTop: 12 }]}>
                        KHUYẾN NGHỊ
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        {record.treatmentGiven || 'Duy trì chế độ ăn cân bằng và đánh giá lại sau 2 tuần.'}
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        Tái khám: {record.nextCheckupDate ? formatDate(record.nextCheckupDate) : 'Chưa đặt lịch'}
                    </Text>
                    <Text style={[styles.paragraph, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        Cập nhật hồ sơ: {formatDateTime(record.createdAt || record.examinationDate)}
                    </Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    errorText: {
        fontSize: 15,
        fontWeight: '600',
    },
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    heroCard: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 12,
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.sm,
    },
    heroImage: {
        width: 96,
        height: 96,
        borderRadius: 16,
    },
    completedBadge: {
        minHeight: 20,
        borderRadius: 10,
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5ED',
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    completedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1D6A43',
    },
    heroTitle: {
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '800',
    },
    heroMeta: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    statRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.sm,
    },
    statCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    statValue: {
        marginTop: 7,
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '800',
    },
    examinerCard: {
        borderRadius: 20,
        padding: 14,
        marginBottom: spacing.sm,
    },
    examinerTitle: {
        color: '#CDE4D9',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    examinerName: {
        marginTop: 6,
        color: '#FFFFFF',
        fontSize: 27,
        lineHeight: 32,
        fontWeight: '800',
    },
    examinerMeta: {
        marginTop: 4,
        color: '#DDEFE6',
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '600',
    },
    examinerActions: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 8,
    },
    examinerButton: {
        flex: 1,
        minHeight: 34,
        borderRadius: 17,
        backgroundColor: '#F4FAF7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    examinerButtonText: {
        color: '#1F5A3A',
        fontSize: 12,
        fontWeight: '800',
    },
    infoCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
        marginBottom: 5,
    },
    infoTag: {
        alignSelf: 'flex-start',
        minHeight: 20,
        borderRadius: 10,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 5,
    },
    diagnosisText: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
    },
});
