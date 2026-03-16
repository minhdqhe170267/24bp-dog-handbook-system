import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { LoadingSpinner } from '../../../src/components/LoadingSpinner';
import { spacing, fontSize, borderRadius } from '../../../src/constants/theme';
import { firstAidService } from '../../../src/services/firstAidService';
import { FirstAidGuide } from '../../../src/types/firstAid';
import { useThemeStore } from '../../../src/stores/themeStore';

export default function FirstAidDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [guide, setGuide] = useState<FirstAidGuide | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await firstAidService.getById(Number(id));
                setGuide(data);
            } catch (error) {
                console.log('Error fetching first aid detail:', error);
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

    if (!guide) {
        return (
            <ScreenWrapper>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>Không tìm thấy hướng dẫn</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, marginTop: spacing.md }}>← Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const parseItems = (text: string) => {
        if (!text) return [];
        return text.split(/[.;\n]/).map(s => s.trim()).filter(s => s.length > 3);
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: colors.text }]}>Hướng dẫn sơ cứu</Text>
                    <TouchableOpacity style={styles.topBarBtn}>
                        <Ionicons name="share-outline" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* Red Emergency Header */}
                <View style={styles.emergencyHeader}>
                    <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>TÌNH HUỐNG KHẨN CẤP</Text>
                    </View>
                    <View style={styles.emergencyContent}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.emergencyTitle}>{guide.guideTitle}</Text>
                            <Text style={styles.emergencySubtitle}>
                                Hành động nhanh chóng để cứu thú cưng của bạn
                            </Text>
                        </View>
                        <View style={styles.emergencyIconBox}>
                            <Ionicons name="medkit" size={28} color="#FFFFFF" />
                        </View>
                    </View>
                </View>

                {/* Immediate Steps — Clean Card List */}
                {guide.immediateSteps && (() => {
                    const steps = parseItems(guide.immediateSteps);
                    return (
                        <View style={[styles.section, { backgroundColor: colors.surface }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? '#1B433230' : '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="list" size={15} color={colors.accent} />
                                    </View>
                                    <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: colors.text }}>Các bước sơ cứu</Text>
                                </View>
                                <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                                    <Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: '600' }}>{steps.length} bước</Text>
                                </View>
                            </View>
                            {steps.map((step, idx) => {
                                const cleanStep = step.replace(/^B\d+:\s*/i, '');
                                return (
                                    <View key={idx} style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        backgroundColor: isDark ? '#FFFFFF08' : '#F8FAF8',
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 8,
                                        borderLeftWidth: 3,
                                        borderLeftColor: colors.accent,
                                    }}>
                                        <View style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: colors.accent,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12,
                                            marginTop: 2,
                                        }}>
                                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{idx + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                                                Bước {idx + 1}
                                            </Text>
                                            <Text style={{ fontSize: fontSize.sm, lineHeight: 20, color: colors.text }}>{cleanStep}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    );
                })()}

                {/* Required Materials */}
                {guide.requiredMaterials && (
                    <View style={[styles.section, { backgroundColor: colors.surface }]}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="bag-check-outline" size={20} color={colors.text} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vật dụng cần thiết</Text>
                        </View>
                        {parseItems(guide.requiredMaterials).map((item, idx) => (
                            <View key={idx} style={styles.materialRow}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                                <Text style={[styles.materialText, { color: colors.textSecondary }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Do NOT Actions — Red Warning Box */}
                {guide.doNotActions && (
                    <View style={styles.warningBox}>
                        <View style={styles.warningHeader}>
                            <Ionicons name="close-circle" size={22} color="#D32F2F" />
                            <Text style={styles.warningTitle}>KHÔNG được làm</Text>
                        </View>
                        {parseItems(guide.doNotActions).map((item, idx) => (
                            <View key={idx} style={styles.warningRow}>
                                <Ionicons name="close" size={18} color="#D32F2F" />
                                <Text style={styles.warningText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* When to Seek Vet — Blue Info Box */}
                {guide.whenToSeekVet && (
                    <View style={[styles.vetBox, { backgroundColor: isDark ? '#0D3B6630' : '#E3F2FD' }]}>
                        <View style={styles.vetHeader}>
                            <Ionicons name="information-circle" size={22} color="#2980B9" />
                            <Text style={[styles.vetTitle, { color: '#2980B9' }]}>Khi nào cần đến bác sĩ</Text>
                        </View>
                        <Text style={[styles.vetText, { color: isDark ? '#90CAF9' : '#1565C0' }]}>
                            {guide.whenToSeekVet}
                        </Text>
                        <TouchableOpacity
                            style={styles.callBtn}
                            activeOpacity={0.85}
                            onPress={() => Linking.openURL('tel:115')}
                        >
                            <Ionicons name="call" size={16} color="#FFFFFF" />
                            <Text style={styles.callBtnText}>Gọi cấp cứu thú y</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, marginTop: spacing.xs },
    topBarBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    topBarTitle: { fontSize: fontSize.lg, fontWeight: '600' },
    emergencyHeader: {
        backgroundColor: '#C62828',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginTop: spacing.sm,
    },
    emergencyBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.md,
    },
    emergencyBadgeText: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
    emergencyContent: { flexDirection: 'row', alignItems: 'center' },
    emergencyTitle: { color: '#FFFFFF', fontSize: fontSize.xxl, fontWeight: 'bold', marginBottom: 4 },
    emergencySubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, lineHeight: 20 },
    emergencyIconBox: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.md,
    },
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
    sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    materialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
    materialText: { flex: 1, fontSize: fontSize.md, lineHeight: 20 },
    warningBox: {
        marginTop: spacing.md,
        backgroundColor: '#FFEBEE',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    warningTitle: { fontSize: fontSize.lg, fontWeight: 'bold', color: '#C62828' },
    warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    warningText: { flex: 1, fontSize: fontSize.md, color: '#C62828', lineHeight: 20 },
    vetBox: {
        marginTop: spacing.md,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    vetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    vetTitle: { fontSize: fontSize.lg, fontWeight: 'bold' },
    vetText: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.lg },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#2E7D32',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    callBtnText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    errorText: { fontSize: fontSize.lg, marginTop: spacing.md },
});
