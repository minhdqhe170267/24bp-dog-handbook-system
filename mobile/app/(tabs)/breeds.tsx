import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../src/components/ScreenWrapper';
import { SearchBar } from '../../src/components/SearchBar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { EmptyState } from '../../src/components/EmptyState';
import { spacing, fontSize, borderRadius } from '../../src/constants/theme';
import { breedService } from '../../src/services/breedService';
import { Breed } from '../../src/types/breed';
import { useThemeStore } from '../../src/stores/themeStore';

const CATEGORIES = [
    { key: 'all', label: 'Tất cả' },
    { key: 'nghiep_vu', label: 'Nghiệp vụ' },
    { key: 'tuan_tra', label: 'Tuần tra' },
    { key: 'phat_hien', label: 'Phát hiện' },
    { key: 'cuu_ho', label: 'Cứu hộ' },
];

const BREED_CATEGORY: Record<number, string[]> = {
    1: ['nghiep_vu', 'tuan_tra'],
    2: ['phat_hien', 'cuu_ho'],
    3: ['nghiep_vu', 'tuan_tra'],
    4: ['tuan_tra'],
    5: ['nghiep_vu', 'tuan_tra'],
};

export default function BreedsScreen() {
    const [breeds, setBreeds] = useState<Breed[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [favorites, setFavorites] = useState<number[]>([]);
    const router = useRouter();
    const { colors, isDark } = useThemeStore();

    useEffect(() => {
        const fetchBreeds = async () => {
            try {
                const data = await breedService.getAll();
                setBreeds(data.content || data || []);
            } catch (error) {
                console.log('Error fetching breeds:', error);
                setBreeds([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBreeds();
    }, []);

    const toggleFavorite = (id: number) => {
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
        );
    };

    const filteredBreeds = breeds.filter((b) => {
        const matchSearch = b.breedName.toLowerCase().includes(search.toLowerCase());
        const matchCategory =
            activeCategory === 'all' ||
            (BREED_CATEGORY[b.breedId] && BREED_CATEGORY[b.breedId].includes(activeCategory));
        return matchSearch && matchCategory;
    });

    const renderHeader = () => (
        <View>
            <Text style={[styles.title, { color: colors.text }]}>Giống chó nghiệp vụ</Text>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm giống chó..." />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.key}
                        onPress={() => setActiveCategory(cat.key)}
                        style={[
                            styles.categoryChip,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            activeCategory === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                    >
                        <Text
                            style={[
                                styles.categoryText,
                                { color: colors.textSecondary },
                                activeCategory === cat.key && { color: colors.white },
                            ]}
                        >
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    if (loading) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <LoadingSpinner message="Đang tải..." />
            </ScreenWrapper>
        );
    }

    if (filteredBreeds.length === 0) {
        return (
            <ScreenWrapper>
                {renderHeader()}
                <EmptyState title="Chưa có dữ liệu" message="Không tìm thấy giống chó nào" icon="paw-outline" />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={filteredBreeds}
                keyExtractor={(item) => String(item.breedId)}
                ListHeaderComponent={renderHeader}
                ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                renderItem={({ item: breed }) => (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push('/breeds/' + breed.breedId)}
                        style={[styles.card, { backgroundColor: colors.surface }]}
                    >
                        <View style={[styles.cardImage, { backgroundColor: isDark ? colors.primaryLight : colors.accentLight }]}>
                            <Ionicons name="paw" size={36} color={colors.primary} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={[styles.breedName, { color: colors.text }]} numberOfLines={1}>{breed.breedName}</Text>
                            <Text style={[styles.breedOrigin, { color: colors.textSecondary }]}>{breed.origin}</Text>
                            <Text style={[styles.breedDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                {breed.description}
                            </Text>
                            <View style={styles.tagRow}>
                                <View style={[styles.tag, { backgroundColor: isDark ? '#1B4332' : '#E8F5E9' }]}>
                                    <Text style={[styles.tagText, { color: isDark ? '#52B788' : '#2E7D32' }]}>{breed.sizeClassification}</Text>
                                </View>
                                <View style={[styles.tag, { backgroundColor: isDark ? '#0D3B66' : '#E3F2FD' }]}>
                                    <Text style={[styles.tagText, { color: isDark ? '#64B5F6' : '#1565C0' }]}>{breed.trainabilityLevel}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => toggleFavorite(breed.breedId)} style={styles.favoriteBtn}>
                            <Ionicons
                                name={favorites.includes(breed.breedId) ? 'heart' : 'heart-outline'}
                                size={22}
                                color={favorites.includes(breed.breedId) ? colors.error : colors.textLight}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: fontSize.title, fontWeight: 'bold', marginVertical: spacing.md },
    categoryScroll: { marginTop: spacing.md, marginBottom: spacing.md },
    categoryContainer: { gap: spacing.sm, paddingRight: spacing.md },
    categoryChip: { paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
    categoryText: { fontSize: fontSize.md, fontWeight: '500' },
    card: { flexDirection: 'row', borderRadius: borderRadius.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
    cardImage: { width: 100, height: 120, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, padding: spacing.md, paddingRight: spacing.xl + spacing.sm, justifyContent: 'space-between' },
    breedName: { fontSize: fontSize.lg, fontWeight: 'bold' },
    breedOrigin: { fontSize: fontSize.sm, marginTop: 2 },
    breedDesc: { fontSize: fontSize.sm, lineHeight: 18, marginTop: spacing.xs },
    tagRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
    tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
    tagText: { fontSize: fontSize.xs, fontWeight: '600' },
    favoriteBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs },
});
