import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScreenWrapper } from '../../../src/components/ScreenWrapper';
import { TrainerRestrictedState } from '../../../src/components/TrainerRestrictedState';
import { spacing } from '../../../src/constants/theme';
import { useAuthStore } from '../../../src/stores/authStore';
import { useThemeStore } from '../../../src/stores/themeStore';
import { fieldNoteService } from '../../../src/services/fieldNoteService';
import { trainerDogScopeService } from '../../../src/services/trainerDogScopeService';
import {
    formatDisplayDateTime,
    getCharacterCountLabel,
    validateTextField,
} from '../../../src/utils/formValidation';
import { DogProfile, FieldNote } from '../../../src/types/dogManagement';
import {
    dogManagementFonts,
    dogManagementUi,
    findFallbackFieldNote,
    pickNoteImage,
} from '../../../src/features/dog-management/ui';

const formatLiveDateTime = (value: Date) => {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
};

export default function FieldNoteFormScreen() {
    const router = useRouter();
    const { dogId, noteId } = useLocalSearchParams<{ dogId?: string; noteId?: string }>();
    const { colors, isDark } = useThemeStore();
    const { user } = useAuthStore();

    const [dogs, setDogs] = useState<DogProfile[]>([]);
    const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(dogId ? Number(dogId) : null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('Hồ Chí Minh, Việt Nam');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [liveRecordedAt, setLiveRecordedAt] = useState(() => new Date());

    const resolvedNoteId = noteId ?? null;
    const fallbackNoteId = noteId && Number.isFinite(Number(noteId)) ? Number(noteId) : null;

    useEffect(() => {
        const loadData = async () => {
            try {
                const scope = await trainerDogScopeService.getScope(true);
                const safeDogs = scope.dogs;
                setDogs(safeDogs);

                if (resolvedNoteId) {
                    try {
                        const detail = await fieldNoteService.getById(resolvedNoteId);
                        const canAccessDog = detail.dogId == null ? true : scope.assignmentMap.has(detail.dogId);
                        const canAccessOwner = detail.dogId != null || !detail.ownerId || detail.ownerId === (user?.userId ?? 0);

                        if (!canAccessDog || !canAccessOwner) {
                            setAccessDenied(true);
                            return;
                        }

                        setEditingNote(detail);
                        setSelectedDogId(detail.dogId || null);
                        setTitle(detail.title);
                        setContent(detail.content);
                        setLocation(detail.location || 'Hồ Chí Minh, Việt Nam');
                        setMediaUrls((detail.media || []).map((item) => item.url));
                        setAccessDenied(false);
                        return;
                    } catch {
                        const fallbackNote = fallbackNoteId ? findFallbackFieldNote(fallbackNoteId) : null;
                        if (fallbackNote) {
                            const canAccessDog = fallbackNote.dogId == null ? true : scope.assignmentMap.has(fallbackNote.dogId);
                            if (!canAccessDog) {
                                setAccessDenied(true);
                                return;
                            }

                            setEditingNote(fallbackNote);
                            setSelectedDogId(fallbackNote.dogId || null);
                            setTitle(fallbackNote.title);
                            setContent(fallbackNote.content);
                            setLocation(fallbackNote.location || 'Hồ Chí Minh, Việt Nam');
                            setMediaUrls((fallbackNote.media || []).map((item) => item.url));
                            setAccessDenied(false);
                            return;
                        }
                    }
                }

                const requestedDogId = dogId ? Number(dogId) : null;
                if (requestedDogId && !scope.assignmentMap.has(requestedDogId)) {
                    setAccessDenied(true);
                    setSelectedDogId(null);
                    return;
                }

                setAccessDenied(false);
                if (safeDogs.length > 0) {
                    setSelectedDogId((current) => {
                        if (requestedDogId && scope.assignmentMap.has(requestedDogId)) {
                            return requestedDogId;
                        }
                        return current ?? safeDogs[0].dogId;
                    });
                }
            } catch {
                setDogs([]);
                setSelectedDogId(null);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dogId, fallbackNoteId, resolvedNoteId, user?.userId]);

    useEffect(() => {
        if (editingNote?.recordedAt) {
            return undefined;
        }

        const timer = setInterval(() => {
            setLiveRecordedAt(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, [editingNote?.recordedAt]);

    const selectedDog = useMemo(
        () => dogs.find((item) => item.dogId === selectedDogId) || null,
        [dogs, selectedDogId],
    );
    const titleError = validateTextField(title, {
        label: 'Tiêu đề ghi chú',
        required: true,
        minLength: 4,
        maxLength: 200,
    });
    const contentError = validateTextField(content, {
        label: 'Nội dung ghi chú',
        required: true,
        minLength: 12,
        maxLength: 50000,
    });
    const locationError = validateTextField(location, {
        label: 'Địa điểm',
        maxLength: 200,
    });
    const mediaError = mediaUrls.length > 8 ? 'Tối đa 8 ảnh cho một ghi chú thực địa.' : null;
    const canSubmit = !titleError && !contentError && !locationError && !mediaError && !saving;
    const recordedAtDisplay = editingNote?.recordedAt
        ? formatDisplayDateTime(editingNote.recordedAt)
        : null;

    const addMockImage = () => {
        if (mediaUrls.length >= 8) {
            Alert.alert('Đã đủ ảnh', 'Mỗi ghi chú thực địa chỉ nên lưu tối đa 8 ảnh để đồng bộ ổn định hơn.');
            return;
        }
        setMediaUrls((current) => [...current, pickNoteImage(Date.now() + current.length)]);
    };

    const removeImage = (url: string) => {
        setMediaUrls((current) => current.filter((item) => item !== url));
    };

    const submit = async () => {
        if (!canSubmit) {
            Alert.alert(
                'Biểu mẫu chưa hợp lệ',
                titleError || contentError || locationError || mediaError || 'Vui lòng kiểm tra lại thông tin ghi chú.',
            );
            return;
        }

        if (!title.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề ghi chú.');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung ghi chú.');
            return;
        }

        setSaving(true);
        const payload = {
            title: title.trim(),
            content: content.trim(),
            dogId: selectedDogId || null,
            location: location.trim() || null,
            recordedAt: editingNote?.recordedAt ?? null,
            mediaUrls,
        };

        try {
            const result = editingNote
                ? await fieldNoteService.update(editingNote.noteId, payload)
                : await fieldNoteService.create(payload);
            router.replace(`/dog-management/field-notes/${String(result.noteId)}` as any);
        } catch {
            const fallbackTarget = editingNote?.noteId;
            Alert.alert('Đã lưu ở giao diện mẫu', 'Ghi chú đã được cập nhật trong luồng frontend.', [
                {
                    text: 'Tiếp tục',
                    onPress: () =>
                        fallbackTarget
                            ? router.replace(`/dog-management/field-notes/${String(fallbackTarget)}` as any)
                            : router.replace(selectedDogId ? `/dog-management/field-notes?dogId=${selectedDogId}` as any : '/dog-management/field-notes'),
                },
            ]);
        } finally {
            setSaving(false);
        }
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

    if (accessDenied) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Không thể mở ghi chú này"
                    description="Bạn chỉ có thể tạo hoặc chỉnh sửa ghi chú trong phạm vi chó được phân công cho mình."
                    onPrimaryPress={() => router.replace('/dog-management/field-notes' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    if (dogs.length === 0 && !editingNote) {
        return (
            <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
                <TrainerRestrictedState
                    title="Chưa có chó trong phạm vi phụ trách"
                    description="Bạn cần được phân công chó trước khi tạo ghi chú thực địa gắn với nhiệm vụ K9."
                    onPrimaryPress={() => router.replace('/dog-management/dogs' as any)}
                    secondaryLabel="Quay lại"
                    onSecondaryPress={() => router.back()}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={{ backgroundColor: isDark ? colors.background : dogManagementUi.page }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.85}>
                    <Ionicons name="arrow-back" size={20} color={isDark ? colors.text : dogManagementUi.textStrong} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.bold }]}>
                    {editingNote ? 'Cập nhật ghi chú' : 'Ghi chú thực địa'}
                </Text>
                <View style={styles.iconButton}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.formGroup, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.groupLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Tiêu đề ghi chú
                    </Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Ví dụ: Tuần tra khu B"
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.input, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                        maxLength={200}
                    />
                    <View style={styles.metaRow}>
                        <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                            {getCharacterCountLabel(title, 200)}
                        </Text>
                    </View>
                    {titleError ? <Text style={[styles.errorText, { color: colors.error }]}>{titleError}</Text> : null}
                </View>

                <View style={[styles.formGroup, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.groupLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Chó liên quan
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dogChipRow}>
                        <TouchableOpacity
                            activeOpacity={0.86}
                            style={[styles.dogChip, { backgroundColor: selectedDogId == null ? colors.primary : '#F3F7F4', borderColor: selectedDogId == null ? colors.primary : '#DDE6E1' }]}
                            onPress={() => setSelectedDogId(null)}
                        >
                            <Text style={[styles.dogChipText, { color: selectedDogId == null ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                Không gắn chó
                            </Text>
                        </TouchableOpacity>
                        {dogs.map((item) => {
                            const active = selectedDogId === item.dogId;
                            return (
                                <TouchableOpacity
                                    key={item.dogId}
                                    activeOpacity={0.86}
                                    style={[styles.dogChip, { backgroundColor: active ? colors.primary : '#F3F7F4', borderColor: active ? colors.primary : '#DDE6E1' }]}
                                    onPress={() => setSelectedDogId(item.dogId)}
                                >
                                    <Text style={[styles.dogChipText, { color: active ? '#FFFFFF' : dogManagementUi.textNormal, fontFamily: dogManagementFonts.bold }]}>
                                        {item.dogName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <Text style={[styles.helperText, { color: isDark ? colors.textSecondary : dogManagementUi.textNormal, fontFamily: dogManagementFonts.medium }]}>
                        {selectedDog ? `${selectedDog.dogCode} • ${selectedDog.breedName || 'Chưa rõ giống'}` : 'Ghi chú này không gắn với chó cụ thể.'}
                    </Text>
                </View>

                <View style={[styles.formGroup, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.groupLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Nội dung và quan sát
                    </Text>
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        placeholder="Mô tả hành vi, cảnh báo, điều kiện môi trường hoặc diễn biến thực địa..."
                        placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                        style={[styles.textArea, { color: isDark ? colors.text : dogManagementUi.textStrong, backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}
                        maxLength={50000}
                    />
                    <View style={styles.metaRow}>
                        <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                            {getCharacterCountLabel(content, 50000)}
                        </Text>
                    </View>
                    {contentError ? <Text style={[styles.errorText, { color: colors.error }]}>{contentError}</Text> : null}
                </View>

                <View style={[styles.formGroup, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.mediaHeader}>
                        <Text style={[styles.groupLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            Tệp đính kèm
                        </Text>
                        <Text style={[styles.mediaCount, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                            {mediaUrls.length} ảnh
                        </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                        {mediaUrls.map((url) => (
                            <View key={url} style={styles.mediaThumbWrap}>
                                <Image source={url} style={styles.mediaThumb} contentFit="cover" />
                                <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(url)} activeOpacity={0.86}>
                                    <Ionicons name="close" size={12} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity activeOpacity={0.88} style={styles.addMediaTile} onPress={addMockImage}>
                            <Ionicons name="camera-outline" size={22} color="#7A8E82" />
                            <Text style={[styles.addMediaText, { fontFamily: dogManagementFonts.bold }]}>Thêm ảnh</Text>
                        </TouchableOpacity>
                    </ScrollView>
                    {mediaError ? <Text style={[styles.errorText, { color: colors.error }]}>{mediaError}</Text> : null}
                </View>

                <View style={[styles.formGroup, { backgroundColor: isDark ? colors.surface : dogManagementUi.surface, borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <Text style={[styles.groupLabel, { color: isDark ? colors.textLight : dogManagementUi.textMuted, fontFamily: dogManagementFonts.bold }]}>
                        Vị trí và thời gian
                    </Text>
                    <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <Ionicons name="location-outline" size={18} color={dogManagementUi.textMuted} />
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Địa điểm ghi nhận"
                            placeholderTextColor={isDark ? colors.textLight : dogManagementUi.textMuted}
                            style={[styles.inlineInput, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}
                            maxLength={200}
                        />
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={[styles.counterText, { color: isDark ? colors.textLight : dogManagementUi.textMuted }]}>
                            {getCharacterCountLabel(location, 200)}
                        </Text>
                    </View>
                    {locationError ? <Text style={[styles.errorText, { color: colors.error }]}>{locationError}</Text> : null}
                    <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                        <Ionicons name="calendar-outline" size={18} color={dogManagementUi.textMuted} />
                        <Text style={[styles.inlineText, { color: isDark ? colors.text : dogManagementUi.textStrong, fontFamily: dogManagementFonts.medium }]}>
                            {recordedAtDisplay ?? formatLiveDateTime(liveRecordedAt)}
                        </Text>
                    </View>
                </View>

                <View style={[styles.mapCard, { borderColor: isDark ? colors.border : dogManagementUi.border }]}>
                    <View style={styles.mapHeader}>
                        <View style={styles.mapStatus}>
                            <Ionicons name="checkmark-circle" size={14} color="#2D7D57" />
                            <Text style={[styles.mapStatusText, { fontFamily: dogManagementFonts.bold }]}>GPS đã khóa</Text>
                        </View>
                        <TouchableOpacity style={styles.mapButton} activeOpacity={0.88}>
                            <Text style={[styles.mapButtonText, { fontFamily: dogManagementFonts.bold }]}>Mở bản đồ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.background : dogManagementUi.page }]}>
                <TouchableOpacity activeOpacity={0.9} disabled={!canSubmit} onPress={submit} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.6 }]}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                            <Text style={[styles.saveButtonText, { fontFamily: dogManagementFonts.bold }]}>
                                {editingNote ? 'Lưu cập nhật' : 'Lưu ghi chú'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    scrollContent: {
        paddingBottom: 120,
        gap: 12,
    },
    formGroup: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    groupLabel: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        fontSize: 14,
        lineHeight: 18,
    },
    dogChipRow: {
        gap: 8,
    },
    dogChip: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dogChipText: {
        fontSize: 12,
        lineHeight: 16,
    },
    helperText: {
        marginTop: 10,
        fontSize: 12,
        lineHeight: 17,
    },
    metaRow: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    counterText: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '700',
    },
    errorText: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '700',
    },
    textArea: {
        minHeight: 132,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 21,
    },
    mediaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    mediaCount: {
        fontSize: 11,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    mediaRow: {
        gap: 10,
    },
    mediaThumbWrap: {
        width: 92,
        height: 92,
        borderRadius: 20,
        overflow: 'hidden',
    },
    mediaThumb: {
        width: '100%',
        height: '100%',
    },
    removeBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 34, 24, 0.58)',
    },
    addMediaTile: {
        width: 92,
        height: 92,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#B8C9BF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FBF9',
        gap: 6,
    },
    addMediaText: {
        color: '#7A8E82',
        fontSize: 11,
        lineHeight: 14,
    },
    inputRow: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    inlineInput: {
        flex: 1,
        fontSize: 14,
        lineHeight: 18,
    },
    inlineText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 18,
    },
    mapCard: {
        minHeight: 126,
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        backgroundColor: '#5F7E6D',
        justifyContent: 'flex-end',
    },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mapStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    mapStatusText: {
        color: '#E6F1EB',
        fontSize: 11,
        lineHeight: 14,
    },
    mapButton: {
        minHeight: 30,
        borderRadius: 15,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#224A35',
    },
    mapButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        lineHeight: 14,
    },
    bottomBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 14,
    },
    saveButton: {
        minHeight: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 18,
    },
});
