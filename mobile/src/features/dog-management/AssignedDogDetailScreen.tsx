import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { TrainerRestrictedState } from '../../components/TrainerRestrictedState';
import { spacing } from '../../constants/theme';
import { useThemeStore } from '../../stores/themeStore';
import { dogService } from '../../services/dogService';
import { fieldNoteService } from '../../services/fieldNoteService';
import { healthRecordService } from '../../services/healthRecordService';
import { healthSessionService } from '../../services/healthSessionService';
import { trainerDogScopeService } from '../../services/trainerDogScopeService';
import type { DogAssignment, DogProfile, FieldNote, HealthRecord, HealthSession } from '../../types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackFieldNotes,
    fallbackHealthRecords,
    fallbackHealthSessions,
    resolveDogImageUrlOrNull,
} from './ui';

type InfoItem = {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    tint?: string;
    wide?: boolean;
};

type ActionItem = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: string;
};

const EMPTY = 'Chưa cập nhật';

const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim().length > 0;

const display = (value?: string | number | null, fallback = EMPTY) =>
    hasValue(value) ? String(value).trim() : fallback;

const formatDate = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return EMPTY;

    const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
    const [year, month, day] = datePart.split('-');
    if (year && month && day) {
        return `${day}/${month}/${year}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const formatDateTime = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return EMPTY;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return raw.includes('T') ? formatDate(raw) : raw;
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed);
};

const formatNumber = (value?: number | string | null, unit = '') => {
    const number = Number(value);
    if (!Number.isFinite(number)) return EMPTY;
    const formatted = Number.isInteger(number) ? String(number) : number.toFixed(1);
    return unit ? `${formatted} ${unit}` : formatted;
};

const formatAge = (ageMonths?: number | null) => {
    const monthsTotal = Number(ageMonths);
    if (!Number.isFinite(monthsTotal) || monthsTotal <= 0) return EMPTY;

    const years = Math.floor(monthsTotal / 12);
    const months = monthsTotal % 12;
    if (!years) return `${months} tháng`;
    return months ? `${years} năm ${months} tháng` : `${years} năm`;
};

const genderLabel = (value?: string | null) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return EMPTY;
    if (normalized === 'MALE' || normalized === 'DUC' || normalized === 'ĐỰC') return 'Đực';
    if (normalized === 'FEMALE' || normalized === 'CAI' || normalized === 'CÁI') return 'Cái';
    return value || EMPTY;
};

const sterilizedLabel = (value?: boolean | null) => {
    if (value === true) return 'Đã triệt sản';
    if (value === false) return 'Chưa triệt sản';
    return EMPTY;
};

const statusMeta = (status?: string | null) => {
    switch (String(status || '').toUpperCase()) {
        case 'ACTIVE':
            return { label: 'Hoạt động', bg: '#DFF4E7', text: '#17623D', icon: 'checkmark-circle' as const };
        case 'INACTIVE':
            return { label: 'Ngừng hoạt động', bg: '#FFF2D8', text: '#946200', icon: 'pause-circle' as const };
        case 'RETIRED':
            return { label: 'Nghỉ hưu', bg: '#EEF1F4', text: '#55616D', icon: 'bed-outline' as const };
        case 'DECEASED':
            return { label: 'Đã mất', bg: '#FFE6E6', text: '#B53030', icon: 'heart-dislike-outline' as const };
        case 'TRANSFERRED':
            return { label: 'Chuyển đơn vị', bg: '#E3F0FF', text: '#0E5DA8', icon: 'swap-horizontal-outline' as const };
        default:
            return { label: EMPTY, bg: '#EEF1F4', text: '#55616D', icon: 'help-circle-outline' as const };
    }
};

const assignmentTypeMeta = (type?: string | null) => {
    switch (String(type || '').toUpperCase()) {
        case 'PRIMARY':
            return { label: 'Phụ trách chính', bg: '#DFF4E7', text: '#17623D' };
        case 'SECONDARY':
            return { label: 'Phối hợp', bg: '#E3F0FF', text: '#0E5DA8' };
        case 'TEMPORARY':
            return { label: 'Tạm thời', bg: '#FFF2D8', text: '#946200' };
        default:
            return { label: EMPTY, bg: '#EEF1F4', text: '#55616D' };
    }
};

const assignmentStatusLabel = (assignment?: DogAssignment | null) => {
    if (!assignment) return EMPTY;
    if (assignment.isActive === false) return 'Hết hiệu lực';
    if (!assignment.endDate) return 'Đang hiệu lực';

    const endDate = new Date(assignment.endDate).getTime();
    return Number.isFinite(endDate) && endDate < Date.now() ? 'Hết hiệu lực' : 'Đang hiệu lực';
};

const latestByDate = <T,>(items: T[], getValue: (item: T) => string | null | undefined): T | null =>
    [...items].sort((left, right) => {
        const leftTime = new Date(getValue(left) || 0).getTime() || 0;
        const rightTime = new Date(getValue(right) || 0).getTime() || 0;
        return rightTime - leftTime;
    })[0] || null;

export default function AssignedDogDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useThemeStore();

    const [dog, setDog] = useState<DogProfile | null>(null);
    const [assignment, setAssignment] = useState<DogAssignment | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [sessions, setSessions] = useState<HealthSession[]>([]);
    const [notes, setNotes] = useState<FieldNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const intro = useRef(new Animated.Value(0)).current;
    const scrollY = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;

    const dogId = Number(id);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const scope = await trainerDogScopeService.getScope(true);

                if (!Number.isFinite(dogId) || !scope.assignmentMap.has(dogId)) {
                    if (mounted) setAccessDenied(true);
                    return;
                }

                const scopedDog = scope.dogs.find((item) => item.dogId === dogId) ?? null;
                const scopedAssignment = scope.assignmentMap.get(dogId) ?? null;

                const [dogResult, recordResult, sessionResult, noteResult] = await Promise.allSettled([
                    dogService.getById(dogId, { forceRemote: true }),
                    healthRecordService.getByDog(dogId, 0, 10),
                    healthSessionService.getByDog(dogId),
                    fieldNoteService.getByDog(dogId),
                ]);

                if (!mounted) return;

                setAccessDenied(false);
                setDog(dogResult.status === 'fulfilled' ? dogResult.value : scopedDog);
                setAssignment(scopedAssignment);
                setRecords(
                    recordResult.status === 'fulfilled'
                        ? ensureArray<HealthRecord>(recordResult.value?.content)
                        : fallbackHealthRecords.filter((item) => item.dogId === dogId),
                );
                setSessions(
                    sessionResult.status === 'fulfilled'
                        ? ensureArray<HealthSession>(sessionResult.value)
                        : fallbackHealthSessions.filter((item) => item.dogId === dogId),
                );
                setNotes(
                    noteResult.status === 'fulfilled'
                        ? ensureArray<FieldNote>(noteResult.value)
                        : fallbackFieldNotes.filter((item) => item.dogId === dogId),
                );
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void loadData();

        return () => {
            mounted = false;
        };
    }, [dogId]);

    useEffect(() => {
        if (!dog || loading) return;

        intro.setValue(0);
        cardAnims.forEach((anim) => anim.setValue(0));

        Animated.parallel([
            Animated.timing(intro, {
                toValue: 1,
                duration: 560,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.stagger(
                75,
                cardAnims.map((anim) =>
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 460,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ),
            ),
        ]).start();

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );

        loop.start();
        return () => loop.stop();
    }, [cardAnims, dog, intro, loading, pulse]);

    const dogImage = resolveDogImageUrlOrNull(dog?.imageUrl);
    const latestRecord = useMemo(() => latestByDate(records, (item) => item.examinationDate), [records]);
    const latestSession = useMemo(() => latestByDate(sessions, (item) => item.lastUpdatedAt || item.startedAt), [sessions]);
    const latestNote = useMemo(() => latestByDate(notes, (item) => item.recordedAt), [notes]);
    const activeSessionCount = useMemo(
        () => sessions.filter((item) => String(item.status || '').toUpperCase() !== 'RESOLVED').length,
        [sessions],
    );

    const dogStatus = useMemo(() => statusMeta(dog?.status), [dog?.status]);
    const assignmentType = useMemo(() => assignmentTypeMeta(assignment?.assignmentType), [assignment?.assignmentType]);

    const profileCompleteness = useMemo(() => {
        if (!dog) return 0;
        const completed = [
            dog.dogName,
            dog.dogCode,
            dog.breedName,
            dog.gender,
            dog.dateOfBirth,
            dog.ageMonths,
            dog.currentWeightKg,
            dog.heightCm,
            dog.color,
            dog.microchipId,
            dog.status,
            dog.assignmentDate,
            dog.isSterilized,
            dog.notes,
            dog.imageUrl,
        ].filter(hasValue).length;

        return Math.round((completed / 15) * 100);
    }, [dog]);

    const heroTranslateY = intro.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
    const heroScale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
    const imageTranslateY = scrollY.interpolate({
        inputRange: [0, 220],
        outputRange: [0, -34],
        extrapolate: 'clamp',
    });
    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0, 220],
        outputRange: [1.08, 1, 1.05],
        extrapolate: 'clamp',
    });
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.12] });

    const animatedCardStyle = (index: number) => ({
        opacity: cardAnims[index] || intro,
        transform: [
            {
                translateY: (cardAnims[index] || intro).interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                }),
            },
        ],
    });

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                        Đang tải hồ sơ chó...
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    if (accessDenied || !dog) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở hồ sơ chó này"
                    description="Bạn chỉ có thể xem hồ sơ và dữ liệu riêng tư của những chó đang được phân công cho mình."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    const identityItems: InfoItem[] = [
        { label: 'ID hồ sơ', value: String(dog.dogId), icon: 'finger-print-outline', tint: '#E3F0FF' },
        { label: 'Mã chó', value: display(dog.dogCode), icon: 'barcode-outline', tint: '#E8F7EE' },
        { label: 'Tên chó', value: display(dog.dogName), icon: 'paw-outline', tint: '#FFF2D8' },
        { label: 'Giống chó', value: display(dog.breedName), icon: 'ribbon-outline', tint: '#F2EFE8' },
        { label: 'ID giống', value: dog.breedId ? String(dog.breedId) : EMPTY, icon: 'layers-outline', tint: '#EAF1FF' },
        { label: 'Giới tính', value: genderLabel(dog.gender), icon: 'male-female-outline', tint: '#F4EAFE' },
        { label: 'Ngày sinh', value: formatDate(dog.dateOfBirth), icon: 'calendar-outline', tint: '#E8F7EE' },
        { label: 'Tháng tuổi', value: formatAge(dog.ageMonths), icon: 'time-outline', tint: '#FFF2D8' },
        { label: 'Ngày phân công', value: formatDate(dog.assignmentDate), icon: 'briefcase-outline', tint: '#E3F0FF' },
        { label: 'Triệt sản', value: sterilizedLabel(dog.isSterilized), icon: 'medical-outline', tint: '#FFE6E6' },
    ];

    const physicalItems: InfoItem[] = [
        { label: 'Cân nặng', value: formatNumber(dog.currentWeightKg, 'kg'), icon: 'barbell-outline', tint: '#E8F7EE' },
        { label: 'Chiều cao', value: formatNumber(dog.heightCm, 'cm'), icon: 'resize-outline', tint: '#E3F0FF' },
        { label: 'Màu lông', value: display(dog.color), icon: 'color-palette-outline', tint: '#FFF2D8' },
        { label: 'Microchip', value: display(dog.microchipId), icon: 'hardware-chip-outline', tint: '#F2EFE8' },
    ];

    const assignmentItems: InfoItem[] = [
        { label: 'Người phụ trách', value: display(assignment?.trainerName), icon: 'person-outline', tint: '#E8F7EE', wide: true },
        { label: 'Trainer ID', value: assignment?.trainerId ? String(assignment.trainerId) : EMPTY, icon: 'id-card-outline', tint: '#E3F0FF' },
        { label: 'ID phân công', value: assignment?.assignmentId ? String(assignment.assignmentId) : EMPTY, icon: 'clipboard-outline', tint: '#FFF2D8' },
        { label: 'Loại phân công', value: assignmentType.label, icon: 'shield-checkmark-outline', tint: assignmentType.bg },
        { label: 'Trạng thái', value: assignmentStatusLabel(assignment), icon: 'pulse-outline', tint: '#E8F7EE' },
        { label: 'Bắt đầu', value: formatDate(assignment?.startDate), icon: 'play-circle-outline', tint: '#EAF1FF' },
        { label: 'Kết thúc', value: formatDate(assignment?.endDate), icon: 'stop-circle-outline', tint: '#FFE6E6' },
    ];

    const actions: ActionItem[] = [
        { icon: 'clipboard-outline', label: 'Phân công', route: `/dog-management/assignments?dogId=${dog.dogId}` },
        { icon: 'medkit-outline', label: 'Hồ sơ sức khỏe', route: `/dog-management/health-records?dogId=${dog.dogId}` },
        { icon: 'pulse-outline', label: 'Phiên theo dõi', route: `/dog-management/health-sessions?dogId=${dog.dogId}` },
        { icon: 'document-text-outline', label: 'Ghi chú thực địa', route: `/dog-management/field-notes?dogId=${dog.dogId}` },
        { icon: 'add-circle-outline', label: 'Khám mới', route: `/dog-management/health-records/new?dogId=${dog.dogId}` },
        { icon: 'barbell-outline', label: 'Đánh giá cân nặng', route: `/dog-management/weight-assessment/${dog.dogId}` },
        { icon: 'sparkles-outline', label: 'Chẩn đoán triệu chứng', route: `/health/symptom-checker?dogId=${dog.dogId}` },
        { icon: 'scale-outline', label: 'Bản ghi cân nặng', route: `/dog-management/weight-records/${dog.dogId}` },
        { icon: 'school-outline', label: 'Chương trình huấn luyện', route: `/training/enrollments?dogId=${dog.dogId}&dogName=${encodeURIComponent(dog.dogName || '')}` },
    ];

    const renderInfoGrid = (items: InfoItem[]) => (
        <View style={styles.infoGrid}>
            {items.map((item) => (
                <View
                    key={`${item.label}-${item.value}`}
                    style={[
                        styles.infoTile,
                        item.wide && styles.infoTileWide,
                        {
                            backgroundColor: isDark ? colors.surface : '#FFFFFF',
                            borderColor: isDark ? colors.border : '#D9E4DE',
                        },
                    ]}
                >
                    <View style={[styles.infoIcon, { backgroundColor: item.tint || '#E8F7EE' }]}>
                        <Ionicons name={item.icon} size={16} color="#235A3D" />
                    </View>
                    <Text style={[styles.infoLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                        {item.label}
                    </Text>
                    <Text style={[styles.infoValue, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        {item.value}
                    </Text>
                </View>
            ))}
        </View>
    );

    const renderSection = (index: number, title: string, subtitle: string, children: React.ReactNode) => (
        <Animated.View style={[styles.sectionBlock, animatedCardStyle(index)]}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                    {title}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                    {subtitle}
                </Text>
            </View>
            {children}
        </Animated.View>
    );

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                    useNativeDriver: true,
                })}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                        Chi tiết chó
                    </Text>
                    <View style={[styles.iconButton, styles.headerStatusIcon]}>
                        <Ionicons name={dogStatus.icon} size={18} color={dogStatus.text} />
                    </View>
                </View>

                <Animated.View
                    style={[
                        styles.heroCard,
                        {
                            opacity: intro,
                            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
                            backgroundColor: isDark ? colors.surface : '#FFFFFF',
                            borderColor: isDark ? colors.border : '#D9E4DE',
                        },
                    ]}
                >
                    <Animated.View style={[styles.heroImageWrap, { transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }]}>
                        {dogImage ? (
                            <Image source={dogImage} style={styles.heroImage} contentFit="cover" />
                        ) : (
                            <View style={[styles.heroImage, styles.heroPlaceholder]}>
                                <Ionicons name="image-outline" size={40} color="#CDE6D8" />
                                <Text style={styles.heroPlaceholderText}>Chưa có ảnh từ web-admin</Text>
                            </View>
                        )}
                    </Animated.View>
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroTopBadges}>
                        <View style={[styles.statusChip, { backgroundColor: dogStatus.bg }]}>
                            <Ionicons name={dogStatus.icon} size={12} color={dogStatus.text} />
                            <Text style={[styles.statusChipText, { color: dogStatus.text }]}>{dogStatus.label}</Text>
                        </View>
                        <View style={[styles.statusChip, { backgroundColor: assignmentType.bg }]}>
                            <Ionicons name="shield-checkmark-outline" size={12} color={assignmentType.text} />
                            <Text style={[styles.statusChipText, { color: assignmentType.text }]}>{assignmentType.label}</Text>
                        </View>
                    </View>

                    <View style={styles.heroContent}>
                        <View style={styles.liveWrap}>
                            <Animated.View style={[styles.livePulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>Hồ sơ từ web-admin</Text>
                        </View>

                        <Text style={styles.heroName}>{display(dog.dogName, 'Chưa đặt tên')}</Text>
                        <Text style={styles.heroMeta}>
                            {display(dog.dogCode, 'Chưa có mã')} · {display(dog.breedName, 'Chưa rõ giống')}
                        </Text>

                        <View style={styles.heroMetricRow}>
                            <View style={styles.heroMetric}>
                                <Text style={styles.heroMetricLabel}>Cân nặng</Text>
                                <Text style={styles.heroMetricValue}>{formatNumber(dog.currentWeightKg, 'kg')}</Text>
                            </View>
                            <View style={styles.heroMetric}>
                                <Text style={styles.heroMetricLabel}>Chiều cao</Text>
                                <Text style={styles.heroMetricValue}>{formatNumber(dog.heightCm, 'cm')}</Text>
                            </View>
                            <View style={styles.heroMetric}>
                                <Text style={styles.heroMetricLabel}>Tuổi</Text>
                                <Text style={styles.heroMetricValue}>{formatAge(dog.ageMonths)}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.kpiGrid, animatedCardStyle(0)]}>
                    {[
                        { label: 'Độ đầy đủ', value: `${profileCompleteness}%`, icon: 'analytics-outline', tint: '#E8F7EE' },
                        { label: 'Hồ sơ khám', value: String(records.length), icon: 'medkit-outline', tint: '#E3F0FF' },
                        { label: 'Phiên mở', value: String(activeSessionCount), icon: 'pulse-outline', tint: '#FFF2D8' },
                        { label: 'Ghi chú', value: String(notes.length), icon: 'document-text-outline', tint: '#F2EFE8' },
                    ].map((item) => (
                        <View
                            key={item.label}
                            style={[
                                styles.kpiCard,
                                {
                                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                    borderColor: isDark ? colors.border : '#D9E4DE',
                                },
                            ]}
                        >
                            <View style={[styles.kpiIcon, { backgroundColor: item.tint }]}>
                                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={15} color="#235A3D" />
                            </View>
                            <Text style={[styles.kpiValue, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                                {item.value}
                            </Text>
                            <Text style={[styles.kpiLabel, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted }]}>
                                {item.label}
                            </Text>
                        </View>
                    ))}
                </Animated.View>

                {renderSection(1, 'Thông tin web-admin', 'Các trường đang tồn tại trong hồ sơ chó.', renderInfoGrid(identityItems))}
                {renderSection(2, 'Thể trạng và định danh', 'Chỉ số cơ thể, màu lông, chip và lịch sử cập nhật.', renderInfoGrid(physicalItems))}
                {renderSection(3, 'Phân công hiện tại', 'Thông tin phân công chó trong phạm vi bạn phụ trách.', renderInfoGrid(assignmentItems))}

                {renderSection(
                    4,
                    'Ghi chú hồ sơ',
                    'Nội dung ghi chú được nhập từ web-admin.',
                    <View
                        style={[
                            styles.notePanel,
                            {
                                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                borderColor: isDark ? colors.border : '#D9E4DE',
                            },
                        ]}
                    >
                        <Ionicons name="reader-outline" size={19} color={colors.primary} />
                        <Text style={[styles.noteText, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                            {display(dog.notes, 'Chưa có ghi chú trong hồ sơ chó.')}
                        </Text>
                    </View>,
                )}

                {renderSection(
                    5,
                    'Hoạt động gần đây',
                    'Dữ liệu liên quan trong phạm vi chó được phân công.',
                    <View style={styles.timelineList}>
                        {[
                            {
                                icon: 'medkit-outline' as const,
                                title: 'Hồ sơ sức khỏe gần nhất',
                                value: latestRecord?.diagnosis || 'Chưa có hồ sơ khám',
                                meta: latestRecord ? formatDateTime(latestRecord.examinationDate) : 'Chưa ghi nhận',
                                tint: '#E3F0FF',
                            },
                            {
                                icon: 'pulse-outline' as const,
                                title: 'Phiên theo dõi gần nhất',
                                value: latestSession?.issueSummary || 'Chưa có phiên theo dõi',
                                meta: latestSession
                                    ? `${display(latestSession.status)} · ${formatDateTime(latestSession.lastUpdatedAt || latestSession.startedAt)}`
                                    : 'Chưa ghi nhận',
                                tint: '#E8F7EE',
                            },
                            {
                                icon: 'document-text-outline' as const,
                                title: 'Ghi chú thực địa gần nhất',
                                value: latestNote?.title || 'Chưa có ghi chú thực địa',
                                meta: latestNote ? formatDateTime(latestNote.recordedAt) : 'Chưa ghi nhận',
                                tint: '#FFF2D8',
                            },
                        ].map((item) => (
                            <View
                                key={item.title}
                                style={[
                                    styles.timelineItem,
                                    {
                                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                        borderColor: isDark ? colors.border : '#D9E4DE',
                                    },
                                ]}
                            >
                                <View style={[styles.timelineIcon, { backgroundColor: item.tint }]}>
                                    <Ionicons name={item.icon} size={16} color="#235A3D" />
                                </View>
                                <View style={styles.timelineBody}>
                                    <Text style={[styles.timelineTitle, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                                        {item.title}
                                    </Text>
                                    <Text style={[styles.timelineValue, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal }]}>
                                        {item.value}
                                    </Text>
                                    <Text style={[styles.timelineMeta, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                                        {item.meta}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>,
                )}

                {renderSection(
                    6,
                    'Tác vụ nhanh',
                    'Mở nhanh các màn xử lý dữ liệu cho hồ sơ chó này.',
                    <View style={styles.actionGrid}>
                        {actions.map((item) => (
                            <TouchableOpacity
                                key={item.label}
                                activeOpacity={0.88}
                                onPress={() => router.push(item.route as any)}
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                        borderColor: isDark ? colors.border : '#D9E4DE',
                                    },
                                ]}
                            >
                                <View style={styles.actionIcon}>
                                    <Ionicons name={item.icon} size={17} color={colors.primary} />
                                </View>
                                <Text style={[styles.actionLabel, { color: isDark ? colors.text : dogManagementUi.textStrong }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>,
                )}
            </Animated.ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        fontFamily: dogManagementFonts.medium,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    headerStatusIcon: {
        backgroundColor: '#E8F7EE',
    },
    headerTitle: {
        fontSize: 19,
        lineHeight: 23,
        fontFamily: dogManagementFonts.bold,
    },
    heroCard: {
        minHeight: 360,
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 14,
    },
    heroImageWrap: {
        ...StyleSheet.absoluteFillObject,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1F5A3A',
    },
    heroPlaceholderText: {
        color: '#D8EADF',
        fontSize: 13,
        lineHeight: 18,
        fontFamily: dogManagementFonts.bold,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 18, 12, 0.36)',
    },
    heroTopBadges: {
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statusChip: {
        minHeight: 28,
        borderRadius: 8,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusChipText: {
        fontSize: 11,
        lineHeight: 14,
        fontFamily: dogManagementFonts.bold,
    },
    heroContent: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
    },
    liveWrap: {
        alignSelf: 'flex-start',
        minHeight: 28,
        borderRadius: 8,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(255,255,255,0.16)',
        marginBottom: 10,
    },
    livePulse: {
        position: 'absolute',
        left: 9,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#B7F3CD',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#B7F3CD',
    },
    liveText: {
        color: '#E8F7EE',
        fontSize: 11,
        lineHeight: 14,
        fontFamily: dogManagementFonts.bold,
    },
    heroName: {
        color: '#FFFFFF',
        fontSize: 34,
        lineHeight: 38,
        fontFamily: dogManagementFonts.bold,
    },
    heroMeta: {
        marginTop: 5,
        color: '#D8EADF',
        fontSize: 14,
        lineHeight: 19,
        fontFamily: dogManagementFonts.medium,
    },
    heroMetricRow: {
        marginTop: 14,
        flexDirection: 'row',
        gap: 8,
    },
    heroMetric: {
        flex: 1,
        minHeight: 62,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    heroMetricLabel: {
        color: '#BFE1CD',
        fontSize: 10,
        lineHeight: 13,
        fontFamily: dogManagementFonts.bold,
        textTransform: 'uppercase',
    },
    heroMetricValue: {
        marginTop: 6,
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
        fontFamily: dogManagementFonts.bold,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
        marginBottom: 16,
    },
    kpiCard: {
        width: '48.5%',
        minHeight: 104,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    kpiIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    kpiValue: {
        fontSize: 23,
        lineHeight: 27,
        fontFamily: dogManagementFonts.bold,
    },
    kpiLabel: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: dogManagementFonts.bold,
        textTransform: 'uppercase',
    },
    sectionBlock: {
        marginBottom: 18,
    },
    sectionHeader: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 21,
        lineHeight: 25,
        fontFamily: dogManagementFonts.bold,
    },
    sectionSubtitle: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: dogManagementFonts.medium,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    infoTile: {
        width: '48.5%',
        minHeight: 116,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    infoTileWide: {
        width: '100%',
        minHeight: 98,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 10,
        lineHeight: 13,
        fontFamily: dogManagementFonts.bold,
        textTransform: 'uppercase',
    },
    infoValue: {
        marginTop: 6,
        fontSize: 15,
        lineHeight: 20,
        fontFamily: dogManagementFonts.bold,
    },
    notePanel: {
        minHeight: 112,
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    noteText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 21,
        fontFamily: dogManagementFonts.medium,
    },
    timelineList: {
        gap: 10,
    },
    timelineItem: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
    },
    timelineIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineBody: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 14,
        lineHeight: 18,
        fontFamily: dogManagementFonts.bold,
    },
    timelineValue: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: dogManagementFonts.medium,
    },
    timelineMeta: {
        marginTop: 5,
        fontSize: 11,
        lineHeight: 14,
        fontFamily: dogManagementFonts.bold,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    actionCard: {
        width: '48.5%',
        minHeight: 92,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
    },
    actionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F7EE',
        marginBottom: 9,
    },
    actionLabel: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: dogManagementFonts.bold,
    },
});
