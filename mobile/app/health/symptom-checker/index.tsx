import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../../src/constants/theme';
import { pickDogImage, resolveDogImageUrl } from '../../../src/features/dog-management/ui';
import { healthToolsUi, severityMeta, symptomCategoryMeta, urgencyMeta } from '../../../src/features/health-tools/ui';
import { symptomCheckerService } from '../../../src/services/symptomCheckerService';
import { symptomService } from '../../../src/services/symptomService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import { useThemeStore } from '../../../src/stores/themeStore';
import type { DogProfile } from '../../../src/types/dogManagement';
import type { SymptomCategory, SymptomCheckerResult, SymptomDiagnosisResult, SymptomItem } from '../../../src/types/symptomChecker';

type CategoryFilter = 'ALL' | SymptomCategory;

const CATEGORIES: CategoryFilter[] = ['ALL', 'EATING', 'BEHAVIOR', 'PHYSICAL', 'RESPIRATORY', 'SKIN', 'OTHER'];

const normalize = (value: string | null | undefined) => String(value || '').trim().toLowerCase();

const buildAgeLabel = (dog: DogProfile | null) => {
    if (!dog?.ageMonths || !Number.isFinite(dog.ageMonths)) {
        return 'Tuổi chưa cập nhật';
    }

    const years = Math.floor(dog.ageMonths / 12);
    const months = dog.ageMonths % 12;

    if (!years) {
        return `${months} tháng`;
    }

    return months ? `${years} năm ${months} tháng` : `${years} năm`;
};

const buildMatchedRatio = (item: SymptomDiagnosisResult) => {
    if (!item.totalDiseaseSymptoms) {
        return 0;
    }

    return Math.min(Math.max(item.matchedSymptoms / item.totalDiseaseSymptoms, 0), 1);
};

export default function SymptomCheckerScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();

    const intro = useRef(new Animated.Value(0)).current;
    const floatOrb = useRef(new Animated.Value(0)).current;
    const resultIntro = useRef(new Animated.Value(0)).current;
    const hasAnimatedIn = useRef(false);
    const scrollRef = useRef<ScrollView | null>(null);

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [selectedSymptomIds, setSelectedSymptomIds] = useState<number[]>([]);
    const [category, setCategory] = useState<CategoryFilter>('ALL');
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<SymptomCheckerResult | null>(null);
    const [savedNotice, setSavedNotice] = useState<string | null>(null);

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) ?? null,
        [dogs, selectedDogId],
    );

    const loadData = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [scope, symptomItems] = await Promise.all([
                trainerDogScopeService.getScope(true),
                symptomService.getAll(),
            ]);

            setDogs(scope.dogs);
            setSymptoms(symptomItems);

            const requestedDogId = dogId ? Number(dogId) : null;
            if (requestedDogId && scope.assignmentMap.has(requestedDogId)) {
                setSelectedDogId(requestedDogId);
            } else if (!selectedDogId && scope.dogs[0]) {
                setSelectedDogId(scope.dogs[0].dogId);
            } else if (selectedDogId && !scope.assignmentMap.has(selectedDogId) && scope.dogs[0]) {
                setSelectedDogId(scope.dogs[0].dogId);
            }
        } catch (error) {
            console.log('[SYMPTOM_CHECKER] Failed to load data:', error);
            setDogs([]);
            setSymptoms([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dogId, selectedDogId]);

    useEffect(() => {
        if (hasAnimatedIn.current) {
            return;
        }

        hasAnimatedIn.current = true;
        intro.setValue(0);
        Animated.timing(intro, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        floatOrb.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatOrb, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(floatOrb, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
        ).start();
    }, [floatOrb, intro]);

    useFocusEffect(
        React.useCallback(() => {
            void loadData();
        }, [loadData]),
    );

    useEffect(() => {
        setResult(null);
        setSavedNotice(null);
        resultIntro.setValue(0);
    }, [resultIntro, selectedDogId, selectedSymptomIds]);

    const visibleSymptoms = useMemo(() => {
        const normalizedKeyword = normalize(keyword);

        return symptoms.filter((item) => {
            const matchesCategory = category === 'ALL' || item.category === category;
            const matchesSearch =
                !normalizedKeyword
                || normalize(item.symptomName).includes(normalizedKeyword)
                || normalize(item.description).includes(normalizedKeyword)
                || normalize(item.symptomCode).includes(normalizedKeyword);

            return matchesCategory && matchesSearch;
        });
    }, [category, keyword, symptoms]);

    const selectedSymptoms = useMemo(
        () => selectedSymptomIds
            .map((symptomId) => symptoms.find((item) => item.symptomId === symptomId))
            .filter((item): item is SymptomItem => Boolean(item)),
        [selectedSymptomIds, symptoms],
    );

    const heroImage = resolveDogImageUrl(selectedDog?.imageUrl, selectedDog?.dogId ?? 'symptom-checker') || pickDogImage(selectedDog?.dogId);

    const toggleSymptom = (symptomId: number) => {
        setSelectedSymptomIds((current) =>
            current.includes(symptomId)
                ? current.filter((item) => item !== symptomId)
                : [...current, symptomId],
        );
    };

    const handleAnalyze = async () => {
        if (!selectedDog) {
            Alert.alert('Thiếu chó', 'Hãy chọn một chó đang được giao trước khi kiểm tra triệu chứng.');
            return;
        }

        if (!selectedSymptomIds.length) {
            Alert.alert('Thiếu triệu chứng', 'Hãy chọn ít nhất một triệu chứng để chạy chẩn đoán.');
            return;
        }

        setAnalyzing(true);
        setSavedNotice(null);

        try {
            const response = await symptomCheckerService.check(
                symptomCheckerService.buildRequestForDog(selectedDog, selectedSymptomIds),
            );
            setResult(response);
            resultIntro.setValue(0);
            Animated.timing(resultIntro, {
                toValue: 1,
                duration: 360,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            });
        } catch (error) {
            console.log('[SYMPTOM_CHECKER] Failed to analyze:', error);
            Alert.alert('Không thể kiểm tra', 'Máy chủ chưa trả được kết quả. Hãy kiểm tra mạng hoặc thử lại sau.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveDiagnosis = async () => {
        if (!selectedDog || !result) {
            return;
        }

        setSaving(true);
        try {
            await symptomCheckerService.saveDiagnosisResult(selectedDog, selectedSymptomIds, result);
            setSavedNotice('Đã lưu kết quả chẩn đoán vào thiết bị và hàng chờ đồng bộ.');
        } catch (error) {
            console.log('[SYMPTOM_CHECKER] Failed to save diagnosis:', error);
            Alert.alert('Không thể lưu', 'Kết quả chẩn đoán chưa được lưu. Hãy thử lại.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!dogs.length) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
                <View style={styles.emptyShell}>
                    <EmptyState
                        icon="medkit-outline"
                        title="Chưa có chó được phân công"
                        message="Symptom Checker chỉ chạy trong phạm vi những chó trainer đang được giao."
                        actionTitle="Quay lại"
                        onAction={() => router.back()}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : healthToolsUi.page }]}>
            <Animated.View
                style={[
                    styles.fill,
                    {
                        transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                    },
                ]}
            >
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={(
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                void loadData('refresh');
                            }}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    )}
                >
                    <View style={styles.heroCard}>
                        <Image source={heroImage} style={styles.heroImage} contentFit="cover" />
                        <View style={styles.heroOverlay} />
                        <Animated.View
                            style={[
                                styles.heroOrb,
                                {
                                    transform: [{ translateY: floatOrb.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
                                },
                            ]}
                        />

                        <View style={styles.heroTopRow}>
                            <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.92}>
                                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.heroButton}
                                onPress={() => {
                                    setSelectedSymptomIds([]);
                                    setResult(null);
                                    setSavedNotice(null);
                                    setKeyword('');
                                    setCategory('ALL');
                                }}
                                activeOpacity={0.92}
                            >
                                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.heroBadge}>
                            <Ionicons name="pulse-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.heroBadgeText}>Symptom Checker</Text>
                        </View>

                        <View>
                            <Text style={styles.heroTitle}>Chẩn đoán theo triệu chứng</Text>
                            <Text style={styles.heroSubtitle}>
                                Chọn chó, đánh dấu các triệu chứng đang quan sát được, rồi nhận danh sách bệnh khả dĩ cùng mức độ ưu tiên xử lý.
                            </Text>
                        </View>

                        {selectedDog ? (
                            <View style={styles.heroDogPill}>
                                <Text style={styles.heroDogPillText}>
                                    {selectedDog.dogName} • {selectedDog.breedName || 'Chưa rõ giống'} • {buildAgeLabel(selectedDog)}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <Text style={styles.sectionTitle}>Chọn chó cần kiểm tra</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogRow}>
                        {dogs.map((dog) => {
                            const active = dog.dogId === selectedDogId;
                            return (
                                <TouchableOpacity
                                    key={dog.dogId}
                                    activeOpacity={0.92}
                                    onPress={() => setSelectedDogId(dog.dogId)}
                                    style={[
                                        styles.dogCard,
                                        {
                                            borderColor: active ? healthToolsUi.brand : healthToolsUi.border,
                                            backgroundColor: active ? '#E7F4EC' : '#FFFFFF',
                                        },
                                    ]}
                                >
                                    <Image source={resolveDogImageUrl(dog.imageUrl, dog.dogId)} style={styles.dogImage} contentFit="cover" />
                                    <View style={styles.dogMeta}>
                                        <Text style={styles.dogName}>{dog.dogName}</Text>
                                        <Text style={styles.dogMetaText}>{dog.dogCode} • {dog.breedName || 'Chưa rõ giống'}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.searchShell}>
                        <Ionicons name="search" size={18} color={healthToolsUi.textMuted} />
                        <TextInput
                            value={keyword}
                            onChangeText={setKeyword}
                            placeholder="Tìm triệu chứng theo tên hoặc mã"
                            placeholderTextColor={healthToolsUi.textMuted}
                            style={styles.searchInput}
                        />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                        {CATEGORIES.map((item) => {
                            const meta = symptomCategoryMeta(item);
                            const active = item === category;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    activeOpacity={0.92}
                                    onPress={() => setCategory(item)}
                                    style={[
                                        styles.categoryChip,
                                        {
                                            backgroundColor: active ? meta.color : meta.bg,
                                            borderColor: active ? meta.color : 'transparent',
                                        },
                                    ]}
                                >
                                    <Ionicons name={meta.icon as any} size={14} color={active ? '#FFFFFF' : meta.color} />
                                    <Text style={[styles.categoryChipText, { color: active ? '#FFFFFF' : meta.color }]}>{meta.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.selectionHeader}>
                        <Text style={styles.sectionTitle}>Triệu chứng đã chọn</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{selectedSymptomIds.length}</Text>
                        </View>
                    </View>

                    {selectedSymptoms.length ? (
                        <View style={styles.selectedWrap}>
                            {selectedSymptoms.map((item) => {
                                const meta = symptomCategoryMeta(item.category);
                                return (
                                    <TouchableOpacity
                                        key={item.symptomId}
                                        activeOpacity={0.92}
                                        onPress={() => toggleSymptom(item.symptomId)}
                                        style={[styles.selectedChip, { backgroundColor: meta.bg }]}
                                    >
                                        <Text style={[styles.selectedChipText, { color: meta.color }]}>{item.symptomName}</Text>
                                        <Ionicons name="close" size={14} color={meta.color} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.inlineEmpty}>
                            <Text style={styles.inlineEmptyText}>Chưa chọn triệu chứng nào.</Text>
                        </View>
                    )}

                    <View style={styles.symptomGrid}>
                        {visibleSymptoms.map((item) => {
                            const meta = symptomCategoryMeta(item.category);
                            const active = selectedSymptomIds.includes(item.symptomId);

                            return (
                                <TouchableOpacity
                                    key={item.symptomId}
                                    activeOpacity={0.92}
                                    onPress={() => toggleSymptom(item.symptomId)}
                                    style={[
                                        styles.symptomCard,
                                        {
                                            backgroundColor: active ? '#E7F4EC' : '#FFFFFF',
                                            borderColor: active ? healthToolsUi.brand : healthToolsUi.border,
                                        },
                                    ]}
                                >
                                    <View style={styles.symptomTopRow}>
                                        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                                            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                                        </View>
                                        <View style={[styles.smallBadge, { backgroundColor: meta.bg }]}>
                                            <Text style={[styles.smallBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.symptomName}>{item.symptomName}</Text>
                                    <Text style={styles.symptomDescription} numberOfLines={2}>
                                        {item.description || 'Không có mô tả chi tiết.'}
                                    </Text>

                                    <View style={styles.symptomFooter}>
                                        <Text style={styles.symptomCode}>{item.symptomCode}</Text>
                                        <Ionicons
                                            name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={18}
                                            color={active ? healthToolsUi.brand : healthToolsUi.textMuted}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {!visibleSymptoms.length ? (
                        <View style={styles.inlineEmpty}>
                            <Text style={styles.inlineEmptyText}>Không có triệu chứng phù hợp với bộ lọc hiện tại.</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => {
                            void handleAnalyze();
                        }}
                        disabled={analyzing || !selectedDog || !selectedSymptomIds.length}
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: analyzing || !selectedDog || !selectedSymptomIds.length ? '#9FB8AA' : healthToolsUi.brand,
                            },
                        ]}
                    >
                        {analyzing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                        )}
                        <Text style={styles.primaryButtonText}>{analyzing ? 'Đang phân tích' : 'Chạy chẩn đoán'}</Text>
                    </TouchableOpacity>

                    {savedNotice ? (
                        <View style={styles.notice}>
                            <Ionicons name="checkmark-circle" size={18} color="#1D6A43" />
                            <Text style={styles.noticeText}>{savedNotice}</Text>
                        </View>
                    ) : null}

                    {result ? (
                        <Animated.View
                            style={{
                                opacity: resultIntro,
                                transform: [{ translateY: resultIntro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                            }}
                        >
                            <View style={styles.resultHero}>
                                <View style={[styles.urgencyBadge, { backgroundColor: urgencyMeta(result.urgencyLevel).bg }]}>
                                    <Text style={[styles.urgencyBadgeText, { color: urgencyMeta(result.urgencyLevel).text }]}>
                                        {urgencyMeta(result.urgencyLevel).label}
                                    </Text>
                                </View>
                                <Text style={styles.resultTitle}>Kết quả chẩn đoán sơ bộ</Text>
                                <Text style={styles.resultDescription}>
                                    {result.recommendation || 'Xem kỹ các bệnh khả dĩ bên dưới và cân nhắc bước xử lý tiếp theo.'}
                                </Text>
                                <View style={styles.resultMetricRow}>
                                    <View style={styles.resultMetricCard}>
                                        <Text style={styles.resultMetricValue}>{result.totalSymptomsChecked}</Text>
                                        <Text style={styles.resultMetricLabel}>Triệu chứng đã kiểm tra</Text>
                                    </View>
                                    <View style={styles.resultMetricCard}>
                                        <Text style={styles.resultMetricValue}>{result.possibleDiseases.length}</Text>
                                        <Text style={styles.resultMetricLabel}>Bệnh khả dĩ</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.92}
                                    onPress={() => {
                                        void handleSaveDiagnosis();
                                    }}
                                    disabled={saving}
                                    style={[styles.secondaryButton, { opacity: saving ? 0.7 : 1 }]}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color={healthToolsUi.brand} />
                                    ) : (
                                        <Ionicons name="save-outline" size={18} color={healthToolsUi.brand} />
                                    )}
                                    <Text style={styles.secondaryButtonText}>{saving ? 'Đang lưu' : 'Lưu kết quả'}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.resultList}>
                                {result.possibleDiseases.map((item) => {
                                    const meta = severityMeta(item.severityLevel);
                                    const matchedRatio = buildMatchedRatio(item);

                                    return (
                                        <View key={`${item.diseaseId}-${item.diseaseName}`} style={styles.resultCard}>
                                            <View style={styles.resultCardHeader}>
                                                <View style={styles.resultCardHeaderText}>
                                                    <Text style={styles.resultCardTitle}>{item.diseaseName}</Text>
                                                    <Text style={styles.resultCardSubtitle}>
                                                        Trùng {item.matchPercentage.toFixed(1)}% • {item.matchedSymptoms}/{item.totalDiseaseSymptoms} triệu chứng
                                                    </Text>
                                                </View>
                                                <View style={[styles.smallBadge, { backgroundColor: meta.bg }]}>
                                                    <Text style={[styles.smallBadgeText, { color: meta.text }]}>{meta.label}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.progressTrack}>
                                                <View style={[styles.progressFill, { width: `${matchedRatio * 100}%` }]} />
                                            </View>

                                            {item.matchedSymptomNames?.length ? (
                                                <View style={styles.resultBlock}>
                                                    <Text style={styles.resultBlockTitle}>Triệu chứng khớp</Text>
                                                    <View style={styles.inlineChipWrap}>
                                                        {item.matchedSymptomNames.map((name) => (
                                                            <View key={name} style={[styles.inlineChip, { backgroundColor: '#E7F4EC' }]}>
                                                                <Text style={[styles.inlineChipText, { color: healthToolsUi.brand }]}>{name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            ) : null}

                                            {item.missingSymptomNames?.length ? (
                                                <View style={styles.resultBlock}>
                                                    <Text style={styles.resultBlockTitle}>Triệu chứng còn thiếu</Text>
                                                    <Text style={styles.resultParagraph}>{item.missingSymptomNames.join(', ')}</Text>
                                                </View>
                                            ) : null}

                                            {item.treatmentGuidelines ? (
                                                <View style={styles.resultBlock}>
                                                    <Text style={styles.resultBlockTitle}>Gợi ý xử lý</Text>
                                                    <Text style={styles.resultParagraph}>{item.treatmentGuidelines}</Text>
                                                </View>
                                            ) : null}

                                            {item.recommendedMedications?.length ? (
                                                <View style={styles.resultBlock}>
                                                    <Text style={styles.resultBlockTitle}>Thuốc tham khảo</Text>
                                                    {item.recommendedMedications.slice(0, 3).map((medication) => (
                                                        <View key={medication.medicationId} style={styles.listItem}>
                                                            <Ionicons name="medical-outline" size={16} color={healthToolsUi.brand} />
                                                            <View style={styles.listItemText}>
                                                                <Text style={styles.listItemTitle}>{medication.medicationName}</Text>
                                                                <Text style={styles.listItemSubtitle}>
                                                                    {[medication.dosageInstructions, medication.administrationMethod].filter(Boolean).join(' • ') || 'Không có ghi chú thêm'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}

                                            {item.recommendedFirstAidGuides?.length ? (
                                                <View style={styles.resultBlock}>
                                                    <Text style={styles.resultBlockTitle}>Sơ cứu nên xem ngay</Text>
                                                    {item.recommendedFirstAidGuides.slice(0, 2).map((guide) => (
                                                        <View key={guide.guideId} style={styles.listItem}>
                                                            <Ionicons name="bandage-outline" size={16} color={healthToolsUi.brand} />
                                                            <View style={styles.listItemText}>
                                                                <Text style={styles.listItemTitle}>{guide.guideTitle}</Text>
                                                                <Text style={styles.listItemSubtitle}>
                                                                    {guide.emergencyType || 'Khẩn cấp'}{guide.notes ? ` • ${guide.notes}` : ''}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    ) : null}
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    safeArea: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyShell: { flex: 1, paddingHorizontal: spacing.md, justifyContent: 'center' },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    heroCard: {
        marginTop: spacing.sm,
        minHeight: 280,
        padding: spacing.lg,
        borderRadius: 30,
        overflow: 'hidden',
        justifyContent: 'space-between',
        backgroundColor: healthToolsUi.brand,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(16, 52, 36, 0.48)',
    },
    heroOrb: {
        position: 'absolute',
        right: -34,
        top: 92,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255,255,255,0.11)',
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroBadgeText: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    heroTitle: {
        marginTop: spacing.lg,
        color: '#FFFFFF',
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '900',
    },
    heroSubtitle: {
        marginTop: spacing.sm,
        color: 'rgba(255,255,255,0.82)',
        fontSize: fontSize.md,
        lineHeight: 22,
    },
    heroDogPill: {
        alignSelf: 'flex-start',
        marginTop: spacing.md,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroDogPillText: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    sectionTitle: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        color: healthToolsUi.textStrong,
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '900',
    },
    dogRow: {
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    dogCard: {
        width: 212,
        borderWidth: 1,
        borderRadius: 22,
        padding: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dogImage: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: '#E8EFEA',
    },
    dogMeta: {
        flex: 1,
        gap: 4,
    },
    dogName: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.md,
        fontWeight: '800',
    },
    dogMetaText: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    searchShell: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: healthToolsUi.border,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        backgroundColor: '#FFFFFF',
    },
    searchInput: {
        flex: 1,
        height: 54,
        color: healthToolsUi.textStrong,
        fontSize: fontSize.md,
    },
    categoryRow: {
        marginTop: spacing.md,
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    categoryChipText: {
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    selectionHeader: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    countBadge: {
        minWidth: 38,
        alignItems: 'center',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: healthToolsUi.brand,
    },
    countBadgeText: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '800',
    },
    selectedWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    selectedChipText: {
        fontSize: fontSize.sm,
        fontWeight: '700',
    },
    inlineEmpty: {
        borderRadius: 20,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    inlineEmptyText: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    symptomGrid: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    symptomCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
    },
    symptomTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallBadge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
    },
    smallBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: '800',
    },
    symptomName: {
        marginTop: spacing.sm,
        color: healthToolsUi.textStrong,
        fontSize: fontSize.lg,
        lineHeight: 24,
        fontWeight: '800',
    },
    symptomDescription: {
        marginTop: 6,
        color: healthToolsUi.textNormal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    symptomFooter: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    symptomCode: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.xs,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    primaryButton: {
        marginTop: spacing.lg,
        minHeight: 56,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: fontSize.md,
        fontWeight: '800',
    },
    notice: {
        marginTop: spacing.md,
        borderRadius: 18,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: '#DFF4E7',
    },
    noticeText: {
        flex: 1,
        color: '#1D6A43',
        fontSize: fontSize.sm,
        lineHeight: 20,
        fontWeight: '700',
    },
    resultHero: {
        marginTop: spacing.lg,
        borderRadius: 26,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    urgencyBadge: {
        alignSelf: 'flex-start',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    urgencyBadgeText: {
        fontSize: fontSize.xs,
        fontWeight: '800',
    },
    resultTitle: {
        marginTop: spacing.md,
        color: healthToolsUi.textStrong,
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '900',
    },
    resultDescription: {
        marginTop: spacing.sm,
        color: healthToolsUi.textNormal,
        fontSize: fontSize.md,
        lineHeight: 22,
    },
    resultMetricRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    resultMetricCard: {
        flex: 1,
        borderRadius: 20,
        padding: spacing.md,
        backgroundColor: '#F3F8F5',
    },
    resultMetricValue: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.xl,
        lineHeight: 28,
        fontWeight: '900',
    },
    resultMetricLabel: {
        marginTop: 4,
        color: healthToolsUi.textMuted,
        fontSize: fontSize.xs,
        lineHeight: 18,
        fontWeight: '700',
    },
    secondaryButton: {
        marginTop: spacing.md,
        minHeight: 52,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: healthToolsUi.brand,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#F7FCF8',
    },
    secondaryButtonText: {
        color: healthToolsUi.brand,
        fontSize: fontSize.md,
        fontWeight: '800',
    },
    resultList: {
        marginTop: spacing.md,
        gap: spacing.md,
    },
    resultCard: {
        borderRadius: 24,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: healthToolsUi.border,
    },
    resultCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    resultCardHeaderText: {
        flex: 1,
        gap: 4,
    },
    resultCardTitle: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.lg,
        lineHeight: 24,
        fontWeight: '800',
    },
    resultCardSubtitle: {
        color: healthToolsUi.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    progressTrack: {
        height: 8,
        marginTop: spacing.md,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#E8EFEA',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: healthToolsUi.brand,
    },
    resultBlock: {
        marginTop: spacing.md,
        gap: 8,
    },
    resultBlockTitle: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.sm,
        lineHeight: 18,
        fontWeight: '800',
    },
    resultParagraph: {
        color: healthToolsUi.textNormal,
        fontSize: fontSize.sm,
        lineHeight: 21,
    },
    inlineChipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    inlineChip: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    inlineChipText: {
        fontSize: fontSize.xs,
        fontWeight: '700',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: 18,
        padding: spacing.md,
        backgroundColor: '#F7FBF8',
    },
    listItemText: {
        flex: 1,
        gap: 4,
    },
    listItemTitle: {
        color: healthToolsUi.textStrong,
        fontSize: fontSize.sm,
        lineHeight: 18,
        fontWeight: '800',
    },
    listItemSubtitle: {
        color: healthToolsUi.textNormal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
