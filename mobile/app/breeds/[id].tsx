import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { breedService } from '../../src/services/breedService';
import { Breed } from '../../src/types/breed';
import { useThemeStore } from '../../src/stores/themeStore';

const TABS = ['Tổng quan', 'Đặc điểm', 'Chăm sóc', 'Huấn luyện'];

export default function BreedDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [breed, setBreed] = useState<Breed | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchBreed = async () => {
            try {
                const data = await breedService.getById(Number(id));
                setBreed(data);
            } catch (error) {
                console.log('Error fetching breed:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBreed();
    }, [id]);

    if (loading) return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><LoadingSpinner message="Đang tải..." /></View>;
    if (!breed) return null;

    const temperament = breed.temperament || ['Trung thành', 'Thông minh', 'Dũng cảm', 'Thân thiện'];

    const InfoRow = ({ label, value }: { label: string; value: string }) => (
        <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoRowLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.infoRowValue, { color: colors.text }]}>{value}</Text>
        </View>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 0:
                return (
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cơ bản</Text>
                        <View style={styles.infoCardRow}>
                            {[
                                { icon: 'resize', label: 'CHIỀU CAO', value: `${breed.avgHeightCm} cm`, ic: colors.primary },
                                { icon: 'barbell', label: 'CÂN NẶNG', value: `${breed.weightMaleMinKg}-${breed.weightMaleMaxKg} kg`, ic: colors.accent },
                                { icon: 'time', label: 'TUỔI THỌ', value: `${breed.lifespanYears} năm`, ic: '#E67E22' },
                            ].map((item) => (
                                <View key={item.label} style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                                    <View style={[styles.infoIconCircle, { backgroundColor: item.ic + '15' }]}>
                                        <Ionicons name={item.icon as any} size={22} color={item.ic} />
                                    </View>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tính cách</Text>
                        <View style={styles.tagContainer}>
                            {temperament.map((trait, i) => (
                                <View key={i} style={[styles.temperamentTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Ionicons name={i % 2 === 0 ? 'heart' : 'star'} size={14} color={colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={[styles.temperamentText, { color: colors.text }]}>{trait}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mô tả</Text>
                        <Text style={[styles.descText, { color: colors.textSecondary }]}>{breed.description}</Text>
                    </View>
                );
            case 1:
                return (
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin chi tiết</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                            <InfoRow label="Xuất xứ" value={breed.origin} />
                            <InfoRow label="Kích thước" value={breed.sizeClassification} />
                            <InfoRow label="Chiều cao TB" value={`${breed.avgHeightCm} cm`} />
                            <InfoRow label="Tuổi thọ" value={`${breed.lifespanYears} năm`} />
                            <InfoRow label="Khả năng huấn luyện" value={breed.trainabilityLevel} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cân nặng chuẩn</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                            <InfoRow label="♂ Đực" value={`${breed.weightMaleMinKg} – ${breed.weightMaleMaxKg} kg`} />
                            <InfoRow label="♀ Cái" value={`${breed.weightFemaleMinKg} – ${breed.weightFemaleMaxKg} kg`} />
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hướng dẫn chăm sóc</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.descText, { color: colors.textSecondary }]}>
                                {breed.careInstructions || `• Cho ăn 2-3 bữa/ngày với thức ăn chất lượng cao\n• Tắm rửa 1-2 lần/tháng\n• Chải lông thường xuyên\n• Khám sức khỏe định kỳ 6 tháng/lần\n• Tiêm phòng đầy đủ theo lịch\n• Vệ sinh tai, mắt, răng hàng tuần`}
                            </Text>
                        </View>
                    </View>
                );
            case 3:
                return (
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Phương pháp huấn luyện</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.descText, { color: colors.textSecondary }]}>
                                {breed.trainingTips || `• Bắt đầu huấn luyện từ 8-12 tuần tuổi\n• Sử dụng phương pháp thưởng tích cực\n• Luyện tập ngắn 10-15 phút/buổi\n• Kiên nhẫn và nhất quán\n• Xã hội hóa sớm với người và động vật khác\n• Huấn luyện các lệnh cơ bản: ngồi, nằm, đến, đứng`}
                            </Text>
                        </View>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.heroImage, { backgroundColor: isDark ? colors.primaryLight : '#2D6A4F' }]}>
                <Ionicons name="paw" size={72} color={colors.white} style={{ opacity: 0.8 }} />
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.surface }]} onPress={() => Alert.alert('Chia sẻ', 'Chức năng đang phát triển')}>
                    <Ionicons name="share-social-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.breedName, { color: colors.text }]}>{breed.breedName}</Text>
                <View style={styles.originRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.originText, { color: colors.textSecondary }]}>{breed.origin}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                    {TABS.map((tab, index) => (
                        <TouchableOpacity key={tab} onPress={() => setActiveTab(index)} style={[styles.tab, activeTab === index && { borderBottomColor: colors.primary }]}>
                            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === index && { color: colors.primary, fontWeight: '700' }]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
                    {renderTabContent()}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => Alert.alert('So sánh', 'Đã thêm vào danh sách so sánh')}>
                            <View style={[styles.actionIconCircle, { backgroundColor: isDark ? '#1B4332' : colors.accentLight }]}>
                                <Ionicons name="git-compare-outline" size={22} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>So sánh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => Alert.alert('Giai đoạn phát triển', 'Chức năng đang phát triển')}>
                            <View style={[styles.actionIconCircle, { backgroundColor: isDark ? '#1B4332' : colors.accentLight }]}>
                                <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>Giai đoạn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => Alert.alert('Cảnh báo', 'Chức năng đang phát triển')}>
                            <View style={[styles.actionIconCircle, { backgroundColor: isDark ? '#3E1111' : '#FFEBEE' }]}>
                                <Ionicons name="warning-outline" size={22} color={colors.error} />
                            </View>
                            <Text style={[styles.actionLabel, { color: colors.error }]}>Cảnh báo</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1 },
    heroImage: { width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' },
    backButton: { position: 'absolute', top: 48, left: 16, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    shareButton: { position: 'absolute', top: 48, right: 16, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    contentContainer: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingHorizontal: spacing.md, paddingTop: spacing.lg },
    breedName: { fontSize: fontSize.title, fontWeight: 'bold' },
    originRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
    originText: { fontSize: fontSize.md, marginLeft: 4 },
    tabScroll: { marginTop: spacing.md, flexGrow: 0 },
    tab: { paddingBottom: spacing.sm, marginRight: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: fontSize.md, fontWeight: '500' },
    tabContent: { paddingTop: spacing.md, paddingBottom: spacing.xl * 2 },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold', marginBottom: spacing.md, marginTop: spacing.sm },
    infoCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    infoCard: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginHorizontal: spacing.xs, alignItems: 'center', elevation: 2 },
    infoIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
    infoLabel: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: 2 },
    infoValue: { fontSize: fontSize.md, fontWeight: 'bold' },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    temperamentTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
    temperamentText: { fontSize: fontSize.sm, fontWeight: '500' },
    descText: { fontSize: fontSize.md, lineHeight: 24 },
    detailCard: { borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, elevation: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm + 2, borderBottomWidth: 1 },
    infoRowLabel: { fontSize: fontSize.md },
    infoRowValue: { fontSize: fontSize.md, fontWeight: '600' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
    actionBtn: { flex: 1, alignItems: 'center', borderRadius: borderRadius.lg, paddingVertical: spacing.md, marginHorizontal: spacing.xs, elevation: 2 },
    actionIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
    actionLabel: { fontSize: fontSize.sm, fontWeight: '600' },
});
