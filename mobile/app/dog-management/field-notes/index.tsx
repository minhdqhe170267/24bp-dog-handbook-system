import React, { useDeferredValue, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { fieldNoteService } from '../../../src/services/fieldNoteService';
import { DogProfile, FieldNote, FieldNoteScope } from '../../../src/types/dogManagement';
import {
    buildFieldNoteExcerpt,
    dogManagementFonts,
    dogManagementUi,
    fallbackFieldNotes,
    fieldNoteScopeOptions,
    findFallbackDog,
    formatDate,
    formatTime,
    getFieldNoteCategoryMeta,
    sortByDateDesc,
} from '../../../src/features/dog-management/ui';

export default function FieldNoteListScreen() {
    const router = useRouter();
    const { dogId } = useLocalSearchParams<{ dogId?: string }>();
    const { colors, isDark } = useThemeStore();
    const { user } = useAuthStore();

    const [notes, setNotes] = useState<FieldNote[]>([]);
    const [contextDog, setContextDog] = useState<DogProfile | null>(null);
    const [scope, setScope] = useState<FieldNoteScope>('ALL');
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const numericDogId = dogId ? Number(dogId) : null;

    const loadData = React.useCallback(async () => {
        try {
            const list = numericDogId ? await fieldNoteService.getByDog(numericDogId) : await fieldNoteService.getAll();
            setNotes(sortByDateDesc(list, (item) => item.recordedAt));
            if (numericDogId) {
                setContextDog(findFallbackDog(numericDogId));
                setScope('DOG');
            }
        } catch {
            const fallbackList = numericDogId ? fallbackFieldNotes.filter((item) => item.dogId === numericDogId) : fallbackFieldNotes;
            setNotes(sortByDateDesc(fallbackList, (item) => item.recordedAt));
            setContextDog(numericDogId ? findFallbackDog(numericDogId) : null);
            if (numericDogId) {
                setScope('DOG');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [numericDogId]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [loadData])
    );

    const filteredNotes = useMemo(() => {
        const term = deferredSearch.trim().toLowerCase();
        return notes.filter((item) => {
            const matchesSearch =
                !term ||
                item.title.toLowerCase().includes(term) ||
                (item.dogName || '').toLowerCase().includes(term) ||
                (item.location || '').toLowerCase().includes(term);

            const matchesScope =
                scope === 'ALL'
                    ? true
                    : scope === 'MINE'
                      ? item.ownerId === (user?.userId ?? 0) || item.isOwner
                      : !!item.dogId;

            return matchesSearch && matchesScope;
        });
    }, [deferredSearch, notes, scope, user?.userId]);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Ghi chú thực địa
                </Text>
                <TouchableOpacity
                    onPress={() => router.push((numericDogId ? `/dog-management/field-notes/form?dogId=${numericDogId}` : '/dog-management/field-notes/form') as any)}
                    style={styles.iconButton}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                {numericDogId
                    ? `Đang hiển thị ghi chú liên quan đến ${contextDog?.dogName || 'chó được chọn'}.`
                    : 'Ghi lại hiện trường, buổi huấn luyện và các tình huống phát sinh trong ca làm việc.'}
            </Text>

            <View style={[styles.searchShell, { backgroundColor: isDark ? colors.surface : '#FAFCFB', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                <Ionicons name="search" size={16} color={dogManagementUi.textMuted} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm theo tiêu đề..."
                    placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                    style={[styles.searchInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}
                />
            </View>

            <View style={styles.filterRow}>
                {fieldNoteScopeOptions.map((item) => {
                    const active = scope === item.key;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.86}
                            style={[styles.filterChip, { backgroundColor: active ? colors.primary : '#F2F6F3', borderColor: active ? colors.primary : '#DDE6E1' }]}
                            onPress={() => setScope(item.key)}
                        >
                            <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                {item.label}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={active ? '#FFFFFF' : dogManagementUi.textMuted} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredNotes}
                    keyExtractor={(item) => String(item.noteId)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="document-text-outline" size={30} color={colors.primary} />
                            <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                Chưa có ghi chú phù hợp
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: isDark ? colors.textSecondary : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                Hãy tạo ghi chú đầu tiên để lưu lại hiện trường hoặc diễn biến nhiệm vụ.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const categoryMeta = getFieldNoteCategoryMeta(item.category);
                        return (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push(`/dog-management/field-notes/${String(item.noteId)}` as any)}
                                style={[styles.noteCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}
                            >
                                <View style={styles.noteTopRow}>
                                    <View style={[styles.noteIconWrap, { backgroundColor: categoryMeta.bg }]}>
                                        <Ionicons name={categoryMeta.icon} size={18} color={categoryMeta.text} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.noteTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                                            {item.title}
                                        </Text>
                                        <Text style={[styles.noteMeta, { color: categoryMeta.text, fontFamily: dogManagementFonts.bold }]}>
                                            {item.dogCode || 'Không gắn mã'} • {item.ownerName || 'Chưa rõ người ghi'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.noteTime, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                                        {formatTime(item.recordedAt)}
                                    </Text>
                                </View>

                                <Text style={[styles.noteExcerpt, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                                    {buildFieldNoteExcerpt(item.content, 120)}
                                </Text>

                                <View style={styles.noteTagRow}>
                                    <View style={styles.noteTag}>
                                        <Text style={[styles.noteTagText, { fontFamily: dogManagementFonts.bold }]}>{categoryMeta.label}</Text>
                                    </View>
                                    {item.location ? (
                                        <View style={styles.noteTag}>
                                            <Text style={[styles.noteTagText, { fontFamily: dogManagementFonts.bold }]}>{item.location}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.noteFooter}>
                                    <Text style={[styles.noteFooterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.medium }]}>
                                        {formatDate(item.recordedAt)}
                                    </Text>
                                    <Text style={[styles.noteFooterText, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                                        Xem chi tiết
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                activeOpacity={0.92}
                onPress={() => router.push((numericDogId ? `/dog-management/field-notes/form?dogId=${numericDogId}` : '/dog-management/field-notes/form') as any)}
            >
                <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
    },
    subtitle: {
        marginBottom: 12,
        fontSize: 13,
        lineHeight: 18,
    },
    searchShell: {
        minHeight: 50,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    filterChip: {
        minHeight: 36,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
    },
    filterChipText: {
        fontSize: 11,
        lineHeight: 14,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 120,
        gap: 12,
    },
    noteCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 14,
    },
    noteTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    noteIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteTitle: {
        fontSize: 17,
        lineHeight: 22,
    },
    noteMeta: {
        marginTop: 3,
        fontSize: 11,
        lineHeight: 15,
    },
    noteTime: {
        fontSize: 11,
        lineHeight: 15,
    },
    noteExcerpt: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    noteTagRow: {
        marginTop: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    noteTag: {
        minHeight: 24,
        borderRadius: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F3',
    },
    noteTagText: {
        color: dogManagementUi.textMuted,
        fontSize: 10,
        lineHeight: 13,
        textTransform: 'uppercase',
    },
    noteFooter: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E4ECE6',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    noteFooterText: {
        fontSize: 11,
        lineHeight: 15,
    },
    emptyWrap: {
        paddingTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    emptyTitle: {
        marginTop: 10,
        fontSize: 18,
        lineHeight: 22,
        textAlign: 'center',
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#123523',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 9,
    },
});
