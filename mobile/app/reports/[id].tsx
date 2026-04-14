import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { borderRadius, fontSize, spacing } from '../../src/constants/theme';
import {
    buildReportExcerpt,
    formatReportDate,
    formatReportDateTime,
    parseMetadataObject,
    reportSyncMeta,
    reportTypeMeta,
    reportUi,
} from '../../src/features/reports/ui';
import { pickDogImage } from '../../src/features/dog-management/ui';
import { reportService } from '../../src/services/reportService';
import { useThemeStore } from '../../src/stores/themeStore';
import type { OperationReportItem } from '../../src/types/report';

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
        </View>
    );
}

export default function ReportDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { colors, isDark } = useThemeStore();
    const intro = useRef(new Animated.Value(0)).current;

    const [item, setItem] = useState<OperationReportItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const loadDetail = React.useCallback(async () => {
        if (!id) {
            setItem(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            setItem(await reportService.getByRouteId(String(id)));
        } catch (error) {
            console.log('[REPORTS] Failed to load detail:', error);
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(
        React.useCallback(() => {
            intro.setValue(0);
            Animated.timing(intro, {
                toValue: 1,
                duration: 620,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();

            void loadDetail();
        }, [intro, loadDetail]),
    );

    const metadataObject = useMemo(() => parseMetadataObject(item?.metadata), [item?.metadata]);
    const typeMeta = reportTypeMeta(item?.reportType);
    const syncMeta = reportSyncMeta(item?.syncStatus);

    const onDelete = () => {
        if (!item) {
            return;
        }

        Alert.alert('Xóa báo cáo', 'Bạn có chắc muốn xóa báo cáo công tác này không?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await reportService.delete(item.routeId);
                        router.replace('/reports' as never);
                    } catch (error: any) {
                        Alert.alert('Không thể xóa', error?.message || 'Đã xảy ra lỗi khi xóa báo cáo.');
                    } finally {
                        setDeleting(false);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : reportUi.page }]}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : reportUi.page }]}>
                <EmptyState
                    icon="document-text-outline"
                    title="Không tìm thấy báo cáo"
                    message="Bản ghi này có thể đã bị xóa hoặc chưa được đồng bộ đầy đủ."
                    actionTitle="Quay lại danh sách"
                    onAction={() => router.replace('/reports' as never)}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : reportUi.page }]}>
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{
                    opacity: intro,
                    transform: [
                        {
                            translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                        },
                    ],
                }}
            >
                <View style={styles.heroCard}>
                    <Image source={pickDogImage(item.dogId)} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroTopRow}>
                        <TouchableOpacity style={styles.heroButton} onPress={() => router.back()} activeOpacity={0.9}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.heroButton}
                            onPress={() =>
                                router.push({
                                    pathname: '/reports/new' as any,
                                    params: { editId: item.routeId },
                                } as any)
                            }
                            activeOpacity={0.9}
                        >
                            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.heroPillRow}>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>{typeMeta.label}</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>{syncMeta.label}</Text>
                        </View>
                    </View>

                    <Text style={styles.heroTitle}>{item.reportTitle}</Text>
                    <Text style={styles.heroSubtitle}>
                        {item.dogName || `Chó #${item.dogId}`}
                        {item.dogCode ? ` • ${item.dogCode}` : ''}
                    </Text>
                    <Text style={styles.heroCaption}>Ngày báo cáo: {formatReportDate(item.reportDate)}</Text>
                </View>

                <View style={styles.metricRow}>
                    <MetricCard label="Nguồn dữ liệu" value={item.source === 'LOCAL' ? 'Thiết bị' : 'Máy chủ'} />
                    <MetricCard label="Cập nhật" value={formatReportDateTime(item.updatedAt || item.createdAt)} />
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Tóm tắt nhanh</Text>
                    <Text style={styles.sectionTitle}>Toàn cảnh báo cáo</Text>
                    <Text style={styles.sectionBody}>{buildReportExcerpt(item)}</Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Nội dung chính</Text>
                    <Text style={styles.sectionTitle}>Chi tiết công tác</Text>
                    <Text style={styles.sectionBody}>
                        {item.reportContent?.trim() || 'Báo cáo này chưa có phần mô tả nội dung chi tiết.'}
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Metadata</Text>
                    <Text style={styles.sectionTitle}>Dữ liệu bổ sung</Text>
                    {metadataObject ? (
                        <View style={styles.metadataList}>
                            {Object.entries(metadataObject).map(([key, value]) => (
                                <View key={key} style={styles.metadataRow}>
                                    <Text style={styles.metadataKey}>{key}</Text>
                                    <Text style={styles.metadataValue}>{String(value)}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.sectionBody}>
                            {item.metadata?.trim() || 'Chưa có dữ liệu bổ sung cho báo cáo này.'}
                        </Text>
                    )}
                </View>

                <View style={styles.actionWrap}>
                    <Button
                        title="Sửa báo cáo"
                        onPress={() =>
                            router.push({
                                pathname: '/reports/new' as any,
                                params: { editId: item.routeId },
                            } as any)
                        }
                        style={styles.actionButton}
                    />
                    <Button
                        title={deleting ? 'Đang xóa...' : 'Xóa báo cáo'}
                        onPress={onDelete}
                        variant="danger"
                        loading={deleting}
                        style={styles.actionButton}
                    />
                </View>
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroCard: {
        marginTop: spacing.sm,
        minHeight: 320,
        borderRadius: 30,
        overflow: 'hidden',
        padding: spacing.lg,
        justifyContent: 'space-between',
    },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,34,24,0.56)' },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
    heroPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroPillText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '700' },
    heroTitle: { marginTop: spacing.md, color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '800' },
    heroSubtitle: { marginTop: spacing.sm, color: '#E1EEE6', fontSize: fontSize.lg, fontWeight: '700' },
    heroCaption: { marginTop: spacing.sm, color: '#D7EADD', fontSize: fontSize.sm, fontWeight: '600' },
    metricRow: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
    metricCard: {
        flex: 1,
        borderRadius: 22,
        padding: spacing.md,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: reportUi.border,
    },
    metricLabel: { color: reportUi.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
    metricValue: { marginTop: 8, color: reportUi.textStrong, fontSize: fontSize.lg, fontWeight: '800' },
    sectionCard: {
        marginTop: spacing.lg,
        borderRadius: 28,
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: reportUi.border,
    },
    sectionEyebrow: {
        color: reportUi.textMuted,
        fontSize: fontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sectionTitle: { marginTop: 6, color: reportUi.textStrong, fontSize: 24, lineHeight: 30, fontWeight: '800' },
    sectionBody: { marginTop: spacing.md, color: reportUi.textNormal, fontSize: fontSize.md, lineHeight: 23 },
    metadataList: { marginTop: spacing.md, gap: spacing.sm },
    metadataRow: {
        padding: spacing.md,
        borderRadius: 18,
        backgroundColor: '#F7FAF8',
        borderWidth: 1,
        borderColor: '#E7EEEA',
    },
    metadataKey: { color: reportUi.textMuted, fontSize: fontSize.sm, fontWeight: '700' },
    metadataValue: { marginTop: 6, color: reportUi.textStrong, fontSize: fontSize.md, lineHeight: 22, fontWeight: '600' },
    actionWrap: { marginTop: spacing.lg, gap: spacing.md },
    actionButton: { borderRadius: 18 },
});
