import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { fieldNoteService } from '../../../src/services/fieldNoteService';
import { FieldNote } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    fallbackFieldNotes,
    findFallbackFieldNote,
    formatDateTime,
    getFieldNoteCategoryMeta,
    getFieldNoteCoverImage,
} from '../../../src/features/dog-management/ui';

export default function FieldNoteDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const { colors, isDark } = useThemeStore();

    const [note, setNote] = useState<FieldNote | null>(null);
    const [loading, setLoading] = useState(true);

    const resolvedNoteId = id;
    const fallbackNoteId = id && Number.isFinite(Number(id)) ? Number(id) : null;

    useEffect(() => {
        const loadData = async () => {
            try {
                const detail = await fieldNoteService.getById(resolvedNoteId);
                setNote(detail);
            } catch {
                setNote((fallbackNoteId ? findFallbackFieldNote(fallbackNoteId) : null) || fallbackFieldNotes[0] || null);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [fallbackNoteId, resolvedNoteId]);

    const isOwner = useMemo(() => {
        return note?.isOwner || note?.ownerId === (user?.userId ?? 0);
    }, [note?.isOwner, note?.ownerId, user?.userId]);

    const removeNote = () => {
        if (!note) {
            return;
        }

        Alert.alert('Xóa ghi chú', 'Bạn có chắc muốn xóa ghi chú này không?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await fieldNoteService.delete(note.noteId);
                        router.replace('/dog-management/field-notes' as any);
                    } catch {
                        Alert.alert('Đã xóa ở giao diện mẫu', 'Ghi chú đã được loại khỏi luồng frontend.', [
                            { text: 'Tiếp tục', onPress: () => router.replace('/dog-management/field-notes' as any) },
                        ]);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (!note) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <View style={styles.centered}>
                    <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                    <Text style={[styles.emptyTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Không tìm thấy ghi chú
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    const categoryMeta = getFieldNoteCategoryMeta(note.category);
    const media = note.media || [];
    const heroImage = getFieldNoteCoverImage(note);

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    Chi tiết ghi chú
                </Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.85} onPress={() => Alert.alert('Chia sẻ', 'Tính năng chia sẻ sẽ được nối ở bước tiếp theo.')}>
                        <Ionicons name="share-social-outline" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
                        <Ionicons name="ellipsis-vertical" size={18} color={isDark ? colors.text : dogManagementUi.textStrong} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroWrap}>
                    <Image source={heroImage} style={styles.heroImage} contentFit="cover" />
                    <View style={[styles.categoryPill, { backgroundColor: categoryMeta.bg }]}>
                        <Text style={[styles.categoryPillText, { color: categoryMeta.text, fontFamily: dogManagementFonts.bold }]}>
                            {categoryMeta.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.metaSection}>
                    <Text style={[styles.unitMeta, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        {note.unitName || 'Đơn vị K9'}
                    </Text>
                    <Text style={[styles.noteTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        {note.title}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                            {note.dogName || 'Không gắn chó'}
                        </Text>
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                            {formatDateTime(note.recordedAt)}
                        </Text>
                        <Text style={[styles.metaText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                            {note.location || 'Chưa rõ vị trí'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.contentCard, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.contentRail} />
                    <Text style={[styles.contentText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}>
                        {note.content}
                    </Text>
                </View>

                <View style={styles.galleryHeader}>
                    <Text style={[styles.galleryTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                        Thư viện ảnh ({media.length})
                    </Text>
                    <Text style={[styles.galleryLink, { color: colors.primary, fontFamily: dogManagementFonts.bold }]}>
                        Xem tất cả
                    </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                    {media.map((item, index) => (
                        <TouchableOpacity key={item.mediaId} activeOpacity={0.9} style={styles.thumbWrap}>
                            <Image source={item.url} style={styles.thumb} contentFit="cover" />
                            {index === 2 && media.length > 3 ? (
                                <View style={styles.thumbOverlay}>
                                    <Text style={[styles.thumbOverlayText, { fontFamily: dogManagementFonts.bold }]}>+{media.length - 2}</Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScrollView>

            {isOwner ? (
                <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                    <TouchableOpacity activeOpacity={0.88} style={[styles.secondaryButton, { backgroundColor: '#EFF3F0' }]} onPress={removeNote}>
                        <Ionicons name="trash-outline" size={18} color={dogManagementUi.textNormal} />
                        <Text style={[styles.secondaryButtonText, { color: dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>Xóa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.9} style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push(`/dog-management/field-notes/form?noteId=${String(note.noteId)}` as any)}>
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                        <Text style={[styles.primaryButtonText, { fontFamily: dogManagementFonts.bold }]}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
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
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F4F1',
    },
    headerTitle: {
        fontSize: 19,
        lineHeight: 23,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 6,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    heroWrap: {
        position: 'relative',
        marginBottom: 16,
    },
    heroImage: {
        width: '100%',
        height: 220,
        borderRadius: 24,
    },
    categoryPill: {
        position: 'absolute',
        left: 14,
        bottom: 14,
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    categoryPillText: {
        fontSize: 11,
        lineHeight: 14,
    },
    metaSection: {
        marginBottom: 16,
    },
    unitMeta: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    noteTitle: {
        marginTop: 8,
        fontSize: 28,
        lineHeight: 32,
    },
    metaRow: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metaText: {
        fontSize: 12,
        lineHeight: 17,
    },
    contentCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
    },
    contentRail: {
        width: 3,
        borderRadius: 2,
        backgroundColor: '#315D47',
    },
    contentText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
    },
    galleryHeader: {
        marginTop: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    galleryTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
    galleryLink: {
        fontSize: 12,
        lineHeight: 16,
    },
    galleryRow: {
        gap: 10,
        paddingBottom: 6,
    },
    thumbWrap: {
        width: 100,
        height: 100,
        borderRadius: 20,
        overflow: 'hidden',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    thumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 34, 24, 0.35)',
    },
    thumbOverlayText: {
        color: '#FFFFFF',
        fontSize: 22,
        lineHeight: 26,
    },
    bottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
        flexDirection: 'row',
        gap: 10,
    },
    secondaryButton: {
        width: 110,
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 14,
        lineHeight: 18,
    },
    primaryButton: {
        flex: 1,
        minHeight: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 18,
    },
    emptyTitle: {
        fontSize: 18,
        lineHeight: 22,
    },
});
