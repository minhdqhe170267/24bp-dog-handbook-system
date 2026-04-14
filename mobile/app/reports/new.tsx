import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import { parseMetadataObject, reportTypeMeta, reportUi } from '../../src/features/reports/ui';
import { assignmentService } from '../../src/services/assignmentService';
import { reportService } from '../../src/services/reportService';
import { useAuthStore } from '../../src/stores/authStore';
import { useThemeStore } from '../../src/stores/themeStore';
import type { ReportType } from '../../src/database/types';

type DogOption = {
    dogId: number;
    dogName: string;
    dogCode: string | null;
};

const REPORT_TYPES: ReportType[] = ['TRAINING', 'HEALTH'];

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10));

const dedupeDogs = (items: DogOption[]) => {
    const seen = new Set<number>();
    return items.filter((item) => {
        if (seen.has(item.dogId)) {
            return false;
        }
        seen.add(item.dogId);
        return true;
    });
};

const normalizeOptionalString = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

export default function ReportFormScreen() {
    const router = useRouter();
    const { dogId, editId } = useLocalSearchParams<{ dogId?: string; editId?: string }>();
    const { user } = useAuthStore();
    const { colors, isDark } = useThemeStore();
    const intro = useRef(new Animated.Value(0)).current;

    const [dogOptions, setDogOptions] = useState<DogOption[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [reportType, setReportType] = useState<ReportType>('TRAINING');
    const [title, setTitle] = useState('');
    const [reportDate, setReportDate] = useState(toDateInput());
    const [content, setContent] = useState('');
    const [phaseName, setPhaseName] = useState('');
    const [score, setScore] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [metadataExtras, setMetadataExtras] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const isEditing = !!editId;

    const loadInitialData = React.useCallback(async () => {
        setLoading(true);
        try {
            const trainerId = user?.userId ?? 0;
            const assignments = trainerId
                ? await assignmentService.getByTrainer(trainerId).catch(() => [])
                : [];

            const assignedDogs = dedupeDogs(
                assignments.map((item) => ({
                    dogId: item.dogId,
                    dogName: item.dogName || `Dog #${item.dogId}`,
                    dogCode: item.dogCode ?? null,
                })),
            ).sort((left, right) => left.dogName.localeCompare(right.dogName, 'vi'));

            let nextDogOptions = assignedDogs;

            if (editId) {
                const detail = await reportService.getByRouteId(String(editId));
                setSelectedDogId(detail.dogId);
                setReportType(String(detail.reportType).toUpperCase() === 'HEALTH' ? 'HEALTH' : 'TRAINING');
                setTitle(detail.reportTitle);
                setReportDate(toDateInput(detail.reportDate));
                setContent(detail.reportContent || '');

                const metadataObject = parseMetadataObject(detail.metadata);
                if (metadataObject) {
                    const { phase, phaseName: phaseLabel, score: rawScore, nextAction: rawNextAction, ...rest } = metadataObject;
                    setPhaseName(typeof phase === 'string'
                        ? phase
                        : typeof phaseLabel === 'string'
                            ? phaseLabel
                            : '');
                    setScore(rawScore == null ? '' : String(rawScore));
                    setNextAction(typeof rawNextAction === 'string' ? rawNextAction : '');
                    setMetadataExtras(rest);
                } else {
                    setPhaseName('');
                    setScore('');
                    setNextAction('');
                    setMetadataExtras({});
                }

                if (!assignedDogs.some((item) => item.dogId === detail.dogId)) {
                    nextDogOptions = dedupeDogs([
                        {
                            dogId: detail.dogId,
                            dogName: detail.dogName || `Dog #${detail.dogId}`,
                            dogCode: detail.dogCode || null,
                        },
                        ...assignedDogs,
                    ]);
                }
            }

            setDogOptions(nextDogOptions);

            if (!selectedDogId && nextDogOptions[0]) {
                setSelectedDogId(nextDogOptions[0].dogId);
            }
        } catch (error) {
            console.log('[REPORTS] Failed to load form:', error);
        } finally {
            setLoading(false);
        }
    }, [editId, selectedDogId, user?.userId]);

    useFocusEffect(
        React.useCallback(() => {
            intro.setValue(0);
            Animated.timing(intro, {
                toValue: 1,
                duration: 620,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();

            void loadInitialData();
        }, [intro, loadInitialData]),
    );

    const selectedDog = useMemo(
        () => dogOptions.find((item) => item.dogId === selectedDogId) || null,
        [dogOptions, selectedDogId],
    );

    const hasFriendlyMetadata = Boolean(phaseName.trim() || score.trim() || nextAction.trim());

    const validate = () => {
        if (!selectedDogId) {
            return '\u0056ui l\u00f2ng ch\u1ecdn ch\u00f3 \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng tr\u01b0\u1edbc khi l\u01b0u b\u00e1o c\u00e1o.';
        }
        if (!title.trim()) {
            return '\u0056ui l\u00f2ng nh\u1eadp ti\u00eau \u0111\u1ec1 b\u00e1o c\u00e1o.';
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate.trim())) {
            return '\u004eg\u00e0y b\u00e1o c\u00e1o c\u1ea7n theo \u0111\u1ecbnh d\u1ea1ng YYYY-MM-DD.';
        }
        if (!content.trim() && !hasFriendlyMetadata) {
            return '\u0043\u1ea7n c\u00f3 \u00edt nh\u1ea5t n\u1ed9i dung ch\u00ednh ho\u1eb7c th\u00f4ng tin b\u1ed5 sung.';
        }
        if (score.trim() && normalizeOptionalNumber(score) == null) {
            return '\u0110i\u1ec3m s\u1ed1 c\u1ea7n l\u00e0 m\u1ed9t gi\u00e1 tr\u1ecb s\u1ed1 h\u1ee3p l\u1ec7.';
        }
        return null;
    };

    const onSubmit = async () => {
        const errorMessage = validate();
        if (errorMessage) {
            Alert.alert('\u0043h\u01b0a th\u1ec3 l\u01b0u', errorMessage);
            return;
        }

        const metadataPayload: Record<string, unknown> = { ...metadataExtras };
        const normalizedPhase = normalizeOptionalString(phaseName);
        const normalizedScore = normalizeOptionalNumber(score);
        const normalizedNextAction = normalizeOptionalString(nextAction);

        if (normalizedPhase) {
            metadataPayload.phase = normalizedPhase;
        } else {
            delete metadataPayload.phase;
            delete metadataPayload.phaseName;
        }

        if (normalizedScore != null) {
            metadataPayload.score = normalizedScore;
        } else {
            delete metadataPayload.score;
        }

        if (normalizedNextAction) {
            metadataPayload.nextAction = normalizedNextAction;
        } else {
            delete metadataPayload.nextAction;
        }

        try {
            setSaving(true);
            const payload = {
                dogId: selectedDogId!,
                reportType,
                reportTitle: title.trim(),
                reportDate: reportDate.trim(),
                reportContent: normalizeOptionalString(content),
                metadata: Object.keys(metadataPayload).length > 0 ? JSON.stringify(metadataPayload) : null,
            };

            const result = editId
                ? await reportService.update(String(editId), payload)
                : await reportService.create(payload);

            router.replace({
                pathname: '/reports/[id]' as any,
                params: { id: result.routeId },
            } as any);
        } catch (error: any) {
            Alert.alert('\u004b\u0068\u00f4ng th\u1ec3 l\u01b0u b\u00e1o c\u00e1o', error?.message || '\u0110\u00e3 x\u1ea3y ra l\u1ed7i khi l\u01b0u b\u00e1o c\u00e1o c\u00f4ng t\u00e1c.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : reportUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                }}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.9}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.heroBadge}>
                            <Ionicons name="create-outline" size={14} color="#DFF4E7" />
                            <Text style={styles.heroBadgeText}>
                                {isEditing ? '\u0043\u1eadp nh\u1eadt b\u00e1o c\u00e1o' : '\u0054\u1ea1o b\u00e1o c\u00e1o m\u1edbi'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.heroTitle}>
                        {isEditing ? '\u0043h\u1ec9nh l\u1ea1i b\u1ea3n ghi c\u00f4ng t\u00e1c' : '\u0054\u1ea1o b\u00e1o c\u00e1o ngay t\u1ea1i hi\u1ec7n tr\u01b0\u1eddng'}
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        {'\u0043h\u1ecdn ch\u00f3 \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng, ghi n\u1ed9i dung v\u00e0 \u0111\u1ec3 thi\u1ebft b\u1ecb gi\u1eef b\u1ea3n ghi t\u00e1c nghi\u1ec7p ngay c\u1ea3 khi b\u1ea1n \u0111ang l\u00e0m vi\u1ec7c trong \u0111i\u1ec1u ki\u1ec7n k\u1ebft n\u1ed1i kh\u00f4ng \u1ed5n \u0111\u1ecbnh.'}
                    </Text>

                    {selectedDog ? (
                        <View style={styles.heroDogCard}>
                            <Text style={styles.heroDogLabel}>{'\u0110ang ch\u1ecdn'}</Text>
                            <Text style={styles.heroDogName}>{selectedDog.dogName}</Text>
                            <Text style={styles.heroDogMeta}>{selectedDog.dogCode || '\u0043h\u01b0a c\u00f3 m\u00e3 nghi\u1ec7p v\u1ee5'}</Text>
                        </View>
                    ) : null}
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                ) : (
                    <>
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{'\u0043h\u00f3 \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng'}</Text>
                            <Text style={styles.sectionHint}>
                                {'\u0043h\u1ec9 hi\u1ec3n th\u1ecb nh\u1eefng ch\u00fa ch\u00f3 trainer \u0111ang \u0111\u01b0\u1ee3c giao ph\u1ee5 tr\u00e1ch.'}
                            </Text>

                            {dogOptions.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogRow}>
                                    {dogOptions.map((item) => {
                                        const active = item.dogId === selectedDogId;
                                        return (
                                            <TouchableOpacity
                                                key={item.dogId}
                                                activeOpacity={0.9}
                                                onPress={() => setSelectedDogId(item.dogId)}
                                                style={[
                                                    styles.dogChip,
                                                    {
                                                        backgroundColor: active ? reportUi.brand : '#FFFFFF',
                                                        borderColor: active ? reportUi.brand : reportUi.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={[styles.dogChipTitle, { color: active ? '#FFFFFF' : reportUi.textStrong }]}>
                                                    {item.dogName}
                                                </Text>
                                                <Text style={[styles.dogChipMeta, { color: active ? '#DDEEE4' : reportUi.textMuted }]}>
                                                    {item.dogCode || '\u0043h\u01b0a c\u00f3 m\u00e3'}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            ) : (
                                <View style={styles.emptyDogWrap}>
                                    <EmptyState
                                        icon="paw-outline"
                                        title={'\u0043h\u01b0a c\u00f3 ch\u00f3 \u0111\u01b0\u1ee3c ph\u00e2n c\u00f4ng'}
                                        message={'\u0048i\u1ec7n t\u1ea1i trainer ch\u01b0a c\u00f3 assignment n\u00e0o ph\u00f9 h\u1ee3p \u0111\u1ec3 l\u1eadp b\u00e1o c\u00e1o.'}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{'\u004co\u1ea1i b\u00e1o c\u00e1o'}</Text>
                            <View style={styles.typeGrid}>
                                {REPORT_TYPES.map((item) => {
                                    const meta = reportTypeMeta(item);
                                    const active = reportType === item;
                                    return (
                                        <TouchableOpacity
                                            key={item}
                                            activeOpacity={0.94}
                                            onPress={() => setReportType(item)}
                                            style={[
                                                styles.typeCard,
                                                {
                                                    backgroundColor: active ? meta.bg : '#FFFFFF',
                                                    borderColor: active ? meta.text : reportUi.border,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.typeTitle, { color: active ? meta.text : reportUi.textStrong }]}>
                                                {meta.label}
                                            </Text>
                                            <Text style={styles.typeHint}>
                                                {item === 'TRAINING'
                                                    ? '\u0054heo d\u00f5i bu\u1ed5i luy\u1ec7n, phase v\u00e0 k\u1ebft qu\u1ea3 follow-up.'
                                                    : '\u0047hi nh\u1eadn tri\u1ec7u ch\u1ee9ng, \u0111i\u1ec1u tr\u1ecb v\u00e0 di\u1ec5n bi\u1ebfn s\u1ee9c kh\u1ecfe.'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{'\u0054h\u00f4ng tin ch\u00ednh'}</Text>

                            <Text style={styles.fieldLabel}>{'\u0054i\u00eau \u0111\u1ec1 b\u00e1o c\u00e1o'}</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>{'\u004eg\u00e0y b\u00e1o c\u00e1o'}</Text>
                            <TextInput
                                value={reportDate}
                                onChangeText={setReportDate}
                                autoCapitalize="none"
                                style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>{'\u004en\u1ed9i dung chi ti\u1ebft'}</Text>
                            <TextInput
                                value={content}
                                onChangeText={setContent}
                                multiline
                                textAlignVertical="top"
                                style={[styles.input, styles.multilineInput]}
                            />
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{'\u0054h\u00f4ng tin b\u1ed5 sung'}</Text>
                            <Text style={styles.sectionHint}>
                                {'\u0043\u00e1c tr\u01b0\u1eddng n\u00e0y s\u1ebd \u0111\u01b0\u1ee3c app t\u1ef1 \u0111\u1ed9ng \u0111\u00f3ng g\u00f3i th\u00e0nh metadata, b\u1ea1n kh\u00f4ng c\u1ea7n nh\u1eadp JSON th\u00f4.'}
                            </Text>

                            <Text style={styles.fieldLabel}>{'\u0047iai \u0111o\u1ea1n / n\u1ed9i dung ph\u1ee5'}</Text>
                            <TextInput
                                value={phaseName}
                                onChangeText={setPhaseName}
                                style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>{'\u0110i\u1ec3m s\u1ed1 (t\u00f9y ch\u1ecdn)'}</Text>
                            <TextInput
                                value={score}
                                onChangeText={setScore}
                                keyboardType="decimal-pad"
                                style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>{'\u0048\u00e0nh \u0111\u1ed9ng ti\u1ebfp theo'}</Text>
                            <TextInput
                                value={nextAction}
                                onChangeText={setNextAction}
                                multiline
                                textAlignVertical="top"
                                style={[styles.input, styles.followUpInput]}
                            />
                        </View>

                        <Button
                            title={
                                saving
                                    ? '\u0110ang l\u01b0u...'
                                    : isEditing
                                        ? '\u004c\u01b0u c\u1eadp nh\u1eadt b\u00e1o c\u00e1o'
                                        : '\u0054\u1ea1o b\u00e1o c\u00e1o c\u00f4ng t\u00e1c'
                            }
                            onPress={() => {
                                void onSubmit();
                            }}
                            loading={saving}
                            disabled={!loading && dogOptions.length === 0}
                            style={styles.submitButton}
                        />
                    </>
                )}
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    heroCard: {
        marginTop: spacing.sm,
        borderRadius: 30,
        padding: spacing.lg,
        backgroundColor: reportUi.brand,
        overflow: 'hidden',
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroBadgeText: { color: '#EAF7F0', fontSize: fontSize.sm, fontWeight: '700' },
    heroTitle: { marginTop: spacing.lg, color: '#FFFFFF', fontSize: 30, lineHeight: 35, fontWeight: '800' },
    heroSubtitle: { marginTop: spacing.sm, color: '#DBEEE2', fontSize: fontSize.md, lineHeight: 22 },
    heroDogCard: { marginTop: spacing.lg, borderRadius: 22, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.14)' },
    heroDogLabel: { color: '#CFE8D8', fontSize: fontSize.sm, fontWeight: '700', textTransform: 'uppercase' },
    heroDogName: { marginTop: 6, color: '#FFFFFF', fontSize: fontSize.xl, fontWeight: '800' },
    heroDogMeta: { marginTop: 4, color: '#D7EADD', fontSize: fontSize.sm, fontWeight: '600' },
    loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
    sectionCard: {
        marginTop: spacing.lg,
        borderRadius: 28,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: reportUi.border,
    },
    sectionTitle: { color: reportUi.textStrong, fontSize: 24, lineHeight: 30, fontWeight: '800' },
    sectionHint: { marginTop: 8, color: reportUi.textNormal, fontSize: fontSize.sm, lineHeight: 20 },
    dogRow: { paddingTop: spacing.md, gap: spacing.sm },
    dogChip: { minWidth: 132, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 18, borderWidth: 1 },
    dogChipTitle: { fontSize: fontSize.md, fontWeight: '800' },
    dogChipMeta: { marginTop: 4, fontSize: fontSize.sm, fontWeight: '600' },
    emptyDogWrap: { marginTop: spacing.md },
    typeGrid: { marginTop: spacing.md, gap: spacing.sm },
    typeCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md },
    typeTitle: { fontSize: fontSize.lg, fontWeight: '800' },
    typeHint: { marginTop: 6, color: reportUi.textNormal, fontSize: fontSize.sm, lineHeight: 20 },
    fieldLabel: { marginTop: spacing.md, marginBottom: 8, color: reportUi.textStrong, fontSize: fontSize.sm, fontWeight: '700' },
    input: {
        borderWidth: 1,
        borderColor: reportUi.border,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        color: reportUi.textStrong,
        backgroundColor: '#FBFDFC',
        fontSize: fontSize.md,
    },
    multilineInput: { minHeight: 170 },
    followUpInput: { minHeight: 110 },
    submitButton: { marginTop: spacing.lg, borderRadius: 20, marginBottom: spacing.lg },
});
