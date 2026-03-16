import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { LoadingSpinner } from '../../../src/components/LoadingSpinner';
import { spacing, fontSize, borderRadius } from '../../../src/constants/theme';
import { diseaseService } from '../../../src/services/diseaseService';
import { Disease } from '../../../src/types/disease';
import { useThemeStore } from '../../../src/stores/themeStore';

const SEVERITY_LABEL: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    CRITICAL: 'Nguy hiểm',
};

const SEVERITY_COLOR: Record<string, string> = {
    LOW: '#2E7D32',
    MEDIUM: '#E67E22',
    HIGH: '#D32F2F',
    CRITICAL: '#7B1FA2',
};

export default function DiseaseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [disease, setDisease] = useState<Disease | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await diseaseService.getById(Number(id));
                setDisease(data);
            } catch (error) {
                console.log('Error fetching disease detail:', error);
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

    if (!disease) {
        return (
            <ScreenWrapper>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.text }]}>Không tìm thấy thông tin bệnh</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, marginTop: spacing.md }}>← Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const sevColor = SEVERITY_COLOR[disease.severityLevel] || '#E67E22';

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionAccent, { backgroundColor: colors.accent }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            </View>
            {children}
        </View>
    );

    const BulletList = ({ text }: { text: string }) => {
        const items = text.split(/[.;\n]/).map(s => s.trim()).filter(Boolean);
        return (
            <View style={styles.bulletList}>
                {items.map((item, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: colors.accent }]}>•</Text>
                        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                ))}
            </View>
        );
    };

    const NumberedList = ({ text }: { text: string }) => {
        const items = text.split(/[.;\n]/).map(s => s.trim()).filter(Boolean);
        return (
            <View style={styles.bulletList}>
                {items.map((item, idx) => (
                    <View key={idx} style={styles.numberedRow}>
                        <View style={[styles.numberCircle, { backgroundColor: colors.accent }]}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.topBarBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: colors.text }]}>Chi tiết bệnh</Text>
                    <View style={styles.topBarBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textLight} />
                    </View>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
                    {/* Icon */}
                    <View style={[styles.avatarCircle, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="medkit" size={32} color={sevColor} />
                    </View>

                    {/* Name */}
                    <Text style={[styles.profileName, { color: colors.text }]}>{disease.diseaseName}</Text>

                    {/* Contagious warning */}
                    {disease.isContagious && (
                        <View style={styles.contagiousCard}>
                            <Ionicons name="warning" size={14} color="#D32F2F" />
                            <Text style={styles.contagiousCardText}>CÓ KHẢ NĂNG LÂY NHIỄM</Text>
                        </View>
                    )}

                    {/* 2x2 Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#4A0E0E20' : '#FFEBEE' }]}>
                                <Ionicons name="speedometer" size={18} color={sevColor} />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>MỨC ĐỘ</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {SEVERITY_LABEL[disease.severityLevel] || disease.severityLevel}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#0D3B6620' : '#E3F2FD' }]}>
                                <Ionicons name="time" size={18} color="#2980B9" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>Ủ BỆNH</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {disease.incubationPeriod || 'N/A'}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#4E260020' : '#FFF3E0' }]}>
                                <Ionicons name="warning" size={18} color="#E67E22" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>LÂY NHIỄM</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {disease.isContagious ? 'Có' : 'Không'}
                            </Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.background : '#F8F9FA' }]}>
                            <View style={[styles.infoCardIcon, { backgroundColor: isDark ? '#1B433220' : '#E8F5E9' }]}>
                                <Ionicons name="heart" size={18} color="#2E7D32" />
                            </View>
                            <Text style={[styles.infoCardLabel, { color: colors.textLight }]}>TÌNH TRẠNG</Text>
                            <Text style={[styles.infoCardValue, { color: colors.text }]}>
                                {disease.severityLevel === 'CRITICAL' ? 'Nghiêm trọng' : disease.severityLevel === 'HIGH' ? 'Nguy hiểm' : 'Theo dõi'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Symptoms */}
                {disease.symptomSummary && (
                    <Section title="Triệu triệu chứng">
                        <BulletList text={disease.symptomSummary} />
                    </Section>
                )}

                {/* Treatment */}
                {disease.treatmentGuidelines && (
                    <Section title="Điều trị">
                        <NumberedList text={disease.treatmentGuidelines} />
                    </Section>
                )}

                {/* Prevention */}
                {disease.preventionMeasures && (
                    <Section title="Phòng ngừa">
                        <NumberedList text={disease.preventionMeasures} />
                    </Section>
                )}

                {/* Description */}
                {disease.description && (
                    <Section title="Mô tả">
                        <Text style={[styles.descText, { color: colors.textSecondary }]}>{disease.description}</Text>
                    </Section>
                )}
            </ScrollView>
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
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    profileName: { fontSize: fontSize.xxl, fontWeight: 'bold', textAlign: 'center' },
    contagiousCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#FFEBEE',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        marginTop: spacing.sm,
    },
    contagiousCardText: { fontSize: fontSize.xs, fontWeight: '700', color: '#D32F2F' },
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
    bulletList: { gap: spacing.sm },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    bullet: { fontSize: 18, lineHeight: 22, fontWeight: 'bold' },
    bulletText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
    numberedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    numberCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    descText: { fontSize: fontSize.md, lineHeight: 22 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    errorText: { fontSize: fontSize.lg, marginTop: spacing.md },
});
