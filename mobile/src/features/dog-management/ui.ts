import { Platform } from 'react-native';
import {
    DogAssignment,
    DogProfile,
    FieldNote,
    FieldNoteCategory,
    HealthRecord,
    HealthSession,
    HealthSessionFollowUpStatus,
    HealthSessionStatus,
    WeightAssessment,
} from '../../types/dogManagement';
import { API_CONFIG } from '../../constants/api';

export const dogManagementUi = {
    page: '#F4F7F5',
    surface: '#FFFFFF',
    border: '#D6E0DA',
    textStrong: '#102218',
    textNormal: '#4E6356',
    textMuted: '#7C9084',
    brand: '#1F5A3A',
    brandDark: '#16452D',
    brandSoft: '#DFF4E7',
    warningSoft: '#FFF2D8',
    warningText: '#9B6A00',
    inactiveSoft: '#EEF1F4',
    inactiveText: '#5A6571',
    dangerSoft: '#FFE6E6',
    dangerText: '#B53030',
    infoSoft: '#E3F0FF',
    infoText: '#0E5DA8',
} as const;

export const dogManagementFonts = {
    regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
};

const imagePool = [
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560743641-3914f2c45636?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=1200&q=80',
];

const backupImagePool = [
    'https://placedog.net/640/640?id=1',
    'https://placedog.net/640/640?id=2',
    'https://placedog.net/640/640?id=3',
    'https://placedog.net/640/640?id=4',
    'https://placedog.net/640/640?id=5',
    'https://placedog.net/640/640?id=6',
];

const noteMediaPool = [
    'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1494256997604-768d1f608cac?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1518715308788-3005759c1f1b?auto=format&fit=crop&w=900&q=80',
];

const seedToIndex = (seed: number | string | null | undefined, poolLength: number) => {
    if (seed == null) {
        return 0;
    }

    const numericSeed =
        typeof seed === 'number'
            ? Math.abs(seed)
            : seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return numericSeed % poolLength;
};

export const pickDogImage = (seed: number | string | null | undefined): string => {
    return imagePool[seedToIndex(seed, imagePool.length)] ?? imagePool[0];
};

export const pickDogBackupImage = (seed: number | string | null | undefined): string => {
    return backupImagePool[seedToIndex(seed, backupImagePool.length)] ?? backupImagePool[0];
};

export const pickNoteImage = (seed: number | string | null | undefined): string => {
    return noteMediaPool[seedToIndex(seed, noteMediaPool.length)] ?? noteMediaPool[0];
};

const isLocalDevHost = (url: string) => /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url);

export const resolveDogImageUrl = (
    imageUrl: string | null | undefined,
    seed: number | string | null | undefined
): string => {
    const fallback = pickDogImage(seed);
    const raw = (imageUrl || '').trim();

    if (!raw) {
        return fallback;
    }

    if (isLocalDevHost(raw)) {
        return fallback;
    }

    if (raw.startsWith('/')) {
        const apiOrigin = API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/i, '');
        return `${apiOrigin}${raw}`;
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    return fallback;
};

const parseDate = (iso: string | null | undefined) => {
    if (!iso) {
        return null;
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};

export const formatDateTime = (iso: string | null | undefined) => {
    const date = parseDate(iso);
    if (!date) {
        return 'Chưa rõ';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const formatDate = (iso: string | null | undefined) => {
    const date = parseDate(iso);
    if (!date) {
        const parts = iso?.split('T')[0];
        if (parts) {
            const [year, month, day] = parts.split('-');
            if (year && month && day) {
                return `${day}/${month}/${year}`;
            }
        }
        return 'Chưa rõ';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
};

export const formatTime = (iso: string | null | undefined) => {
    const date = parseDate(iso);
    if (!date) {
        return '--:--';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const stringifyWeight = (weight: number | null | undefined) => {
    if (weight == null || Number.isNaN(Number(weight))) {
        return 'Chưa cập nhật';
    }

    return `${Number(weight).toFixed(1)} kg`;
};

export const stringifyTemperature = (temperature: number | null | undefined) => {
    if (temperature == null || Number.isNaN(Number(temperature))) {
        return 'Chưa ghi nhận';
    }

    return `${Number(temperature).toFixed(1)}°C`;
};

export const toShortRole = (role: string | null | undefined) => {
    if (!role) {
        return 'Trainer';
    }

    return role
        .toUpperCase()
        .split('_')
        .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
        .join(' ');
};

export const getDogStatusMeta = (status: string | null | undefined) => {
    switch ((status || '').toUpperCase()) {
        case 'ACTIVE':
            return { label: 'Đang hoạt động', bg: '#DFF4E7', text: '#1D6A43' };
        case 'INACTIVE':
            return { label: 'Tạm ngưng', bg: '#FFF2D8', text: '#9B6A00' };
        case 'RETIRED':
            return { label: 'Nghỉ nhiệm vụ', bg: '#EEF1F4', text: '#5A6571' };
        case 'DECEASED':
            return { label: 'Đã mất', bg: '#FFE6E6', text: '#B53030' };
        case 'TRANSFERRED':
            return { label: 'Đã chuyển', bg: '#E3F0FF', text: '#0E5DA8' };
        default:
            return { label: 'Chưa rõ', bg: '#EEF1F4', text: '#5A6571' };
    }
};

export const getAssignmentTypeMeta = (type: string | null | undefined) => {
    switch ((type || '').toUpperCase()) {
        case 'PRIMARY':
            return { label: 'Chính', bg: '#DFF4E7', text: '#1D6A43' };
        case 'SECONDARY':
            return { label: 'Phối hợp', bg: '#E3F0FF', text: '#0E5DA8' };
        case 'TEMPORARY':
            return { label: 'Tạm thời', bg: '#FFF2D8', text: '#9B6A00' };
        default:
            return { label: 'Khác', bg: '#EEF1F4', text: '#5A6571' };
    }
};

export const getBooleanMeta = (flag: boolean | null | undefined) => {
    if (flag) {
        return { label: 'Đang hiệu lực', bg: '#DFF4E7', text: '#1D6A43' };
    }

    return { label: 'Hết hiệu lực', bg: '#EEF1F4', text: '#5A6571' };
};

export const getWeightAlertMeta = (level: string | null | undefined) => {
    switch ((level || '').toUpperCase()) {
        case 'CRITICAL':
            return { label: 'Cảnh báo cao', bg: '#FFE6E6', text: '#B53030' };
        case 'WARNING':
            return { label: 'Cần theo dõi', bg: '#FFF2D8', text: '#9B6A00' };
        default:
            return { label: 'Ổn định', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const getWeightTrendMeta = (trend: string | null | undefined) => {
    switch ((trend || '').toUpperCase()) {
        case 'LOSING':
            return { label: 'Đang giảm', bg: '#FFF2D8', text: '#9B6A00' };
        case 'GAINING':
            return { label: 'Đang tăng', bg: '#E3F0FF', text: '#0E5DA8' };
        default:
            return { label: 'Ổn định', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const getSessionStatusMeta = (status: string | null | undefined) => {
    switch ((status || '').toUpperCase()) {
        case 'ACTIVE':
            return { label: 'Đang mở', bg: '#DFF4E7', text: '#1D6A43' };
        case 'MONITORING':
            return { label: 'Đang theo dõi', bg: '#E3F0FF', text: '#0E5DA8' };
        case 'RESOLVED':
            return { label: 'Đã kết thúc', bg: '#EEF1F4', text: '#5A6571' };
        case 'ESCALATED':
            return { label: 'Cần xử lý gấp', bg: '#FFE6E6', text: '#B53030' };
        default:
            return { label: 'Chưa rõ', bg: '#EEF1F4', text: '#5A6571' };
    }
};

export const getSeverityMeta = (severity: string | null | undefined) => {
    switch ((severity || '').toUpperCase()) {
        case 'HIGH':
            return { label: 'Ưu tiên cao', bg: '#FFE6E6', text: '#B53030' };
        case 'MEDIUM':
            return { label: 'Ưu tiên vừa', bg: '#FFF2D8', text: '#9B6A00' };
        default:
            return { label: 'Ưu tiên thấp', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const getFollowUpStatusMeta = (status: HealthSessionFollowUpStatus | string | null | undefined) => {
    switch ((status || '').toUpperCase()) {
        case 'IMPROVED':
            return { label: 'Cải thiện', bg: '#DFF4E7', text: '#1D6A43', icon: 'checkmark-circle' as const };
        case 'SAME':
            return { label: 'Ổn định', bg: '#EEF1F4', text: '#5A6571', icon: 'remove-circle' as const };
        case 'WORSE':
            return { label: 'Xấu hơn', bg: '#FFE6E6', text: '#B53030', icon: 'alert-circle' as const };
        case 'RESOLVED':
            return { label: 'Đã xử lý', bg: '#DFF4E7', text: '#1D6A43', icon: 'shield-checkmark' as const };
        default:
            return { label: 'Cập nhật', bg: '#EEF1F4', text: '#5A6571', icon: 'ellipse' as const };
    }
};

export const getFieldNoteCategoryMeta = (category: FieldNoteCategory | string | null | undefined) => {
    switch ((category || '').toUpperCase()) {
        case 'PATROL':
            return { label: 'Tuần tra', bg: '#EAF3ED', text: '#376851', icon: 'shield-half-outline' as const };
        case 'TRAINING':
            return { label: 'Huấn luyện', bg: '#FFF2D8', text: '#9B6A00', icon: 'fitness-outline' as const };
        case 'MEDICAL':
            return { label: 'Y tế', bg: '#E3F0FF', text: '#0E5DA8', icon: 'medkit-outline' as const };
        case 'EVENT':
            return { label: 'Sự kiện', bg: '#F0ECE8', text: '#6C5947', icon: 'eye-outline' as const };
        case 'SURVEILLANCE':
            return { label: 'Giám sát', bg: '#EEF1F4', text: '#5A6571', icon: 'scan-outline' as const };
        default:
            return { label: 'Ghi chú', bg: '#EEF1F4', text: '#5A6571', icon: 'document-text-outline' as const };
    }
};

export const sortByDateDesc = <T>(items: T[], getValue: (item: T) => string | null | undefined) => {
    return [...items].sort((left, right) => {
        const leftTime = parseDate(getValue(left))?.getTime() || 0;
        const rightTime = parseDate(getValue(right))?.getTime() || 0;
        return rightTime - leftTime;
    });
};

export const findFallbackDog = (dogId: number) => fallbackDogs.find((item) => item.dogId === dogId) || null;
export const findFallbackWeightAssessment = (dogId: number) =>
    fallbackWeightAssessments.find((item) => item.dogId === dogId) || null;
export const findFallbackHealthSession = (sessionId: number | string) =>
    fallbackHealthSessions.find((item) => String(item.sessionId) === String(sessionId)) || null;
export const findFallbackFieldNote = (noteId: number) =>
    fallbackFieldNotes.find((item) => item.noteId === noteId) || null;

export const getSessionCoverImage = (session: Pick<HealthSession, 'sessionId' | 'dogId' | 'coverImageUrl'>) =>
    resolveDogImageUrl(session.coverImageUrl, session.dogId || session.sessionId);

export const getFieldNoteCoverImage = (note: Pick<FieldNote, 'noteId' | 'dogId' | 'media'>) =>
    note.media?.[0]?.url || pickNoteImage(note.dogId || note.noteId);

export const buildFieldNoteExcerpt = (content: string | null | undefined, maxLength = 110) => {
    const value = (content || '').trim();
    if (!value) {
        return 'Chưa có mô tả chi tiết.';
    }
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, maxLength).trim()}...`;
};

export const fallbackDogs: DogProfile[] = [
    {
        dogId: 101,
        dogCode: 'DK001',
        dogName: 'Jax',
        breedName: 'Belgian Malinois',
        ageMonths: 48,
        currentWeightKg: 29.4,
        status: 'ACTIVE',
        gender: 'Đực',
        color: 'Vàng nâu',
        microchipId: 'MC-2026-1001',
        imageUrl: imagePool[0],
    },
    {
        dogId: 102,
        dogCode: 'DK003',
        dogName: 'Bruno',
        breedName: 'Rottweiler',
        ageMonths: 60,
        currentWeightKg: 64,
        status: 'ACTIVE',
        gender: 'Đực',
        color: 'Đen nâu',
        microchipId: 'MC-2026-1003',
        imageUrl: imagePool[1],
    },
    {
        dogId: 103,
        dogCode: 'K9-Bella',
        dogName: 'Bella',
        breedName: 'Labrador',
        ageMonths: 38,
        currentWeightKg: 24.6,
        status: 'ACTIVE',
        gender: 'Cái',
        color: 'Vàng kem',
        microchipId: 'MC-2026-1012',
        imageUrl: imagePool[2],
    },
    {
        dogId: 104,
        dogCode: 'K9-Luna',
        dogName: 'Luna',
        breedName: 'Béc-giê Đức',
        ageMonths: 44,
        currentWeightKg: 31.2,
        status: 'ACTIVE',
        gender: 'Cái',
        color: 'Đen vàng',
        microchipId: 'MC-2026-1018',
        imageUrl: imagePool[3],
    },
];

export const fallbackAssignments: DogAssignment[] = [
    {
        assignmentId: 901,
        dogId: 101,
        dogName: 'Jax',
        dogCode: 'DK001',
        trainerId: 12,
        trainerName: 'Trung sĩ Miller',
        assignmentType: 'PRIMARY',
        startDate: '2026-03-01',
        isActive: true,
        notes: 'Theo dõi ca tuần tra dài và phản xạ khẩu lệnh nâng cao.',
    },
    {
        assignmentId: 902,
        dogId: 102,
        dogName: 'Bruno',
        dogCode: 'DK003',
        trainerId: 12,
        trainerName: 'Nguyễn Văn Kiên',
        assignmentType: 'PRIMARY',
        startDate: '2026-03-04',
        isActive: true,
        notes: 'Theo dõi phục hồi thể lực sau giai đoạn giảm cân.',
    },
    {
        assignmentId: 903,
        dogId: 103,
        dogName: 'Bella',
        dogCode: 'K9-Bella',
        trainerId: 12,
        trainerName: 'Lê Hoài Uyên',
        assignmentType: 'TEMPORARY',
        startDate: '2026-03-09',
        endDate: '2026-03-28',
        isActive: true,
        notes: 'Tăng cường các bài tìm kiếm mùi trong môi trường kín.',
    },
    {
        assignmentId: 904,
        dogId: 104,
        dogName: 'Luna',
        dogCode: 'K9-Luna',
        trainerId: 12,
        trainerName: 'Đỗ Công Tùng',
        assignmentType: 'SECONDARY',
        startDate: '2026-03-12',
        isActive: true,
        notes: 'Phối hợp giám sát khu vực sự kiện công cộng.',
    },
];

export const fallbackHealthRecords: HealthRecord[] = [
    {
        recordId: 3001,
        dogId: 101,
        dogName: 'Jax',
        dogCode: 'DK001',
        examinerName: 'Bác sĩ quân y Trần Hải',
        examinationDate: '2026-03-15T09:30:00',
        weightKg: 29.4,
        diagnosis: 'Thể trạng ổn định, phù hợp cường độ nhiệm vụ hiện tại.',
        temperatureC: 38.4,
        appetiteLevel: 'NORMAL',
        activityLevel: 'NORMAL',
        fecesStatus: 'NORMAL',
        nextCheckupDate: '2026-03-22',
    },
    {
        recordId: 3002,
        dogId: 102,
        dogName: 'Bruno',
        dogCode: 'DK003',
        examinerName: 'Nguyễn Văn Kiên',
        examinationDate: '2026-03-18T14:00:00',
        weightKg: 64,
        diagnosis: 'Tiến triển giảm cân tốt nhưng xuất hiện dấu hiệu viêm khớp hông nhẹ.',
        temperatureC: 38.9,
        appetiteLevel: 'NORMAL',
        activityLevel: 'LOW',
        fecesStatus: 'NORMAL',
        nextCheckupDate: '2026-03-22',
    },
    {
        recordId: 3003,
        dogId: 103,
        dogName: 'Bella',
        dogCode: 'K9-Bella',
        examinerName: 'Bác sĩ Thúy',
        examinationDate: '2026-03-14T11:15:00',
        weightKg: 24.6,
        diagnosis: 'Suy giảm thể trạng nhẹ sau chuỗi bài tập cường độ cao.',
        temperatureC: 38.5,
        appetiteLevel: 'DECREASED',
        activityLevel: 'LOW',
        fecesStatus: 'NORMAL',
        nextCheckupDate: '2026-03-21',
    },
    {
        recordId: 3004,
        dogId: 104,
        dogName: 'Luna',
        dogCode: 'K9-Luna',
        examinerName: 'Bác sĩ Hoàng Nam',
        examinationDate: '2026-03-10T08:00:00',
        weightKg: 31.2,
        diagnosis: 'Khám định kỳ ổn định, đủ điều kiện tiếp tục làm nhiệm vụ giám sát.',
        temperatureC: 38.3,
        appetiteLevel: 'NORMAL',
        activityLevel: 'NORMAL',
        fecesStatus: 'NORMAL',
    },
];

export const fallbackWeightAssessments: WeightAssessment[] = [
    {
        dogId: 101,
        dogName: 'Jax',
        dogCode: 'DK001',
        breedName: 'Belgian Malinois',
        handlerName: 'Trung sĩ Miller',
        unitName: 'Đơn vị K9-Alpha',
        currentWeightKg: 29.4,
        ageMonths: 48,
        gender: 'Đực',
        standardMinKg: 25,
        standardMaxKg: 34,
        deviationPercent: 0.7,
        weightStatus: 'Tối ưu',
        trend: 'STABLE',
        weightChangeKg: 0.3,
        alertLevel: 'NORMAL',
        lastAssessmentAt: '2026-03-04T08:30:00',
        recentHistory: [
            { recordDate: '2026-02-10', weightKg: 28.8, changeKg: -0.2 },
            { recordDate: '2026-02-24', weightKg: 29.1, changeKg: 0.3 },
            { recordDate: '2026-03-04', weightKg: 29.4, changeKg: 0.3 },
        ],
        recommendations: [
            {
                title: 'Duy trì khối cơ nạc',
                detail: 'Giữ khẩu phần hiện tại có đạm chất lượng cao để hỗ trợ thể lực và sức bền đường dài.',
            },
            {
                title: 'Bổ sung dinh dưỡng triển khai',
                detail: 'Tăng năng lượng 5-10% vào các ngày tuần tra cường độ cao hoặc huấn luyện liên tục.',
            },
            {
                title: 'Kiểm tra hình thể định kỳ',
                detail: 'Mỗi tuần quan sát độ săn chắc thành bụng và khả năng lộ nhẹ xương sườn khi sờ.',
            },
        ],
        recommendation:
            'Thể trạng hiện nằm trong vùng tối ưu. Tiếp tục duy trì khẩu phần và lịch vận động hiện tại.',
    },
    {
        dogId: 102,
        dogName: 'Bruno',
        dogCode: 'DK003',
        breedName: 'Rottweiler',
        handlerName: 'Nguyễn Văn Kiên',
        unitName: 'Đội phản ứng nhanh',
        currentWeightKg: 64,
        ageMonths: 60,
        gender: 'Đực',
        standardMinKg: 56,
        standardMaxKg: 62,
        deviationPercent: 3.2,
        weightStatus: 'Vượt chuẩn nhẹ',
        trend: 'LOSING',
        weightChangeKg: -1.1,
        alertLevel: 'WARNING',
        lastAssessmentAt: '2026-03-18T08:00:00',
        recentHistory: [
            { recordDate: '2026-02-02', weightKg: 66.1, changeKg: -0.2 },
            { recordDate: '2026-02-18', weightKg: 65.4, changeKg: -0.7 },
            { recordDate: '2026-03-02', weightKg: 64.8, changeKg: -0.6 },
            { recordDate: '2026-03-18', weightKg: 64, changeKg: -0.8 },
        ],
        recommendations: [
            {
                title: 'Duy trì tiến độ giảm cân',
                detail: 'Giảm nhẹ chất béo trong khẩu phần, ưu tiên bài tập bền kết hợp đi bộ nhanh hằng ngày.',
            },
            {
                title: 'Theo dõi khớp hông',
                detail: 'Hạn chế bài nhảy cao liên tục trong 2 tuần tới để giảm tải lên khớp lớn.',
            },
            {
                title: 'Đánh giá lại sau follow-up',
                detail: 'Chụp lại cân nặng và vòng ngực trong lần tái khám kế tiếp để xác nhận xu hướng tốt.',
            },
        ],
        recommendation:
            'Cần tiếp tục điều chỉnh khẩu phần và khối lượng vận động để đưa cân nặng về vùng chuẩn giống.',
    },
];

export const fallbackHealthSessions: HealthSession[] = [
    {
        sessionId: 5001,
        dogId: 101,
        dogName: 'Jax',
        dogCode: 'DK001',
        dogBreedName: 'Belgian Malinois',
        handlerName: 'Trung sĩ Miller',
        unitName: 'Đơn vị K9-Alpha',
        issueSummary: 'Viêm da vùng cổ nhẹ',
        status: 'ACTIVE',
        severity: 'HIGH',
        startedAt: '2026-03-10T08:10:00',
        lastUpdatedAt: '2026-03-18T13:45:00',
        followUpDate: '2026-03-22',
        followUpCount: 4,
        coverImageUrl: imagePool[0],
        pulseBpm: 88,
        bloodPressureSystolic: 124,
        spo2Percent: 98,
        isLiveSync: true,
        timeline: [
            {
                followUpId: 7001,
                sessionId: 5001,
                statusUpdate: 'IMPROVED',
                title: 'Phục hồi sau huấn luyện',
                notes: 'Nhịp tim trở về ngưỡng nền nhanh hơn phiên trước, nhịp thở đều và mức hydrat hóa tốt.',
                nextAction: 'Tiếp tục chăm sóc da tại chỗ và giảm cọ xát vùng cổ 48 giờ.',
                weightKg: 29.4,
                temperatureC: 38.4,
                pulseBpm: 88,
                bloodPressureSystolic: 124,
                spo2Percent: 98,
                createdAt: '2026-03-18T14:45:00',
            },
            {
                followUpId: 7002,
                sessionId: 5001,
                statusUpdate: 'SAME',
                title: 'Đánh giá giữa ca',
                notes: 'Không ghi nhận tăng kích ứng khi chạy bài vượt chướng ngại. Nhiệt độ trong ngưỡng bình thường.',
                nextAction: 'Theo dõi thêm 24 giờ và bôi thuốc chống viêm đúng liều.',
                weightKg: 29.4,
                temperatureC: 38.5,
                pulseBpm: 92,
                bloodPressureSystolic: 126,
                spo2Percent: 97,
                createdAt: '2026-03-18T12:30:00',
            },
            {
                followUpId: 7003,
                sessionId: 5001,
                statusUpdate: 'WORSE',
                title: 'Tăng phản ứng trước buổi tập',
                notes: 'Mạch tăng 115 BPM trước giờ tập. Có dấu hiệu kích thích nhẹ khi mang vòng cổ trong lúc chuẩn bị.',
                nextAction: 'Giảm khối lượng bài tập và chuyển sang dây mềm.',
                weightKg: 29.4,
                temperatureC: 38.7,
                pulseBpm: 115,
                bloodPressureSystolic: 130,
                spo2Percent: 96,
                createdAt: '2026-03-18T09:15:00',
            },
        ],
    },
    {
        sessionId: 5002,
        dogId: 103,
        dogName: 'Bella',
        dogCode: 'K9-Bella',
        dogBreedName: 'Labrador',
        handlerName: 'Lê Hoài Uyên',
        unitName: 'Đội tìm kiếm mùi',
        issueSummary: 'Suy giảm thể trạng sau huấn luyện',
        status: 'MONITORING',
        severity: 'MEDIUM',
        startedAt: '2026-03-12T10:00:00',
        lastUpdatedAt: '2026-03-17T16:00:00',
        followUpDate: '2026-03-20',
        followUpCount: 2,
        coverImageUrl: imagePool[2],
        pulseBpm: 82,
        bloodPressureSystolic: 120,
        spo2Percent: 99,
        isLiveSync: true,
        timeline: [
            {
                followUpId: 7101,
                sessionId: 5002,
                statusUpdate: 'SAME',
                title: 'Theo dõi thể lực sau buổi sáng',
                notes: 'Chó giảm hưng phấn ở 20 phút cuối bài. Ăn uống đã khá hơn nhưng thể trạng chưa về nền.',
                nextAction: 'Bổ sung bữa phụ sau huấn luyện và giảm tải 1 buổi/tuần.',
                weightKg: 24.6,
                temperatureC: 38.5,
                pulseBpm: 82,
                bloodPressureSystolic: 120,
                spo2Percent: 99,
                createdAt: '2026-03-17T16:00:00',
            },
            {
                followUpId: 7102,
                sessionId: 5002,
                statusUpdate: 'IMPROVED',
                title: 'Khả năng hồi phục tốt hơn',
                notes: 'Tăng mức tập trung và hoàn thành đủ 3 chặng tìm kiếm trong nhà kho kín.',
                nextAction: 'Duy trì khẩu phần mới thêm 5 ngày.',
                weightKg: 24.5,
                temperatureC: 38.4,
                pulseBpm: 84,
                bloodPressureSystolic: 118,
                spo2Percent: 99,
                createdAt: '2026-03-15T10:15:00',
            },
        ],
    },
    {
        sessionId: 5003,
        dogId: 104,
        dogName: 'Luna',
        dogCode: 'K9-Luna',
        dogBreedName: 'Béc-giê Đức',
        handlerName: 'Đỗ Công Tùng',
        unitName: 'Đội giám sát sự kiện',
        issueSummary: 'Theo dõi sau va chạm nhẹ ở khu vực cổng',
        status: 'RESOLVED',
        severity: 'LOW',
        startedAt: '2026-03-06T09:30:00',
        lastUpdatedAt: '2026-03-11T18:20:00',
        followUpDate: '2026-03-11',
        followUpCount: 3,
        coverImageUrl: imagePool[3],
        pulseBpm: 78,
        bloodPressureSystolic: 118,
        spo2Percent: 99,
        isLiveSync: false,
        resolutionNotes: 'Không còn biểu hiện đau hoặc khập khiễng. Trở lại nhiệm vụ giám sát bình thường.',
        timeline: [
            {
                followUpId: 7201,
                sessionId: 5003,
                statusUpdate: 'RESOLVED',
                title: 'Hoàn tất theo dõi',
                notes: 'Khả năng di chuyển và phản xạ trở lại bình thường, không cần can thiệp thêm.',
                nextAction: 'Đóng phiên và tiếp tục theo dõi định kỳ theo lịch tháng.',
                weightKg: 31.2,
                temperatureC: 38.2,
                pulseBpm: 78,
                bloodPressureSystolic: 118,
                spo2Percent: 99,
                createdAt: '2026-03-11T18:20:00',
            },
        ],
    },
];

export const fallbackFieldNotes: FieldNote[] = [
    {
        noteId: 8101,
        title: 'Tuần tra đêm khu B',
        content:
            'Đã kiểm tra toàn bộ hàng rào phía Tây, không phát hiện dấu hiệu xâm nhập. Trong phần tiếp cận điểm mù, chó phản ứng tốt với tín hiệu tay. Khi kiểm tra gần cổng Tây, Luna duy trì tư thế quan sát ổn định và không có báo động giả.',
        dogId: 104,
        dogName: 'Luna',
        dogCode: 'K9-Luna',
        ownerId: 0,
        ownerName: 'Đỗ Công Tùng',
        unitName: 'Đội Alpha',
        location: 'Cổng Tây',
        recordedAt: '2026-03-15T20:30:00',
        photoCount: 4,
        category: 'PATROL',
        isOwner: true,
        media: [
            { mediaId: 1, url: noteMediaPool[0] },
            { mediaId: 2, url: noteMediaPool[1] },
            { mediaId: 3, url: noteMediaPool[2] },
            { mediaId: 4, url: noteMediaPool[3] },
        ],
        tags: ['Tuần tra', 'Khu B'],
    },
    {
        noteId: 8102,
        title: 'Bài tập tìm kiếm mùi',
        content:
            'Thực hiện bài tập tìm kiếm chất nổ trong khu vực nhà kho. Bella phản ứng tốt với mùi vôi và giữ nhịp làm việc đều trong 3 lượt đầu. Ở lượt cuối, mức tập trung giảm nhẹ khi có tiếng động nền mạnh.',
        dogId: 103,
        dogName: 'Bella',
        dogCode: 'K9-Bella',
        ownerId: 15,
        ownerName: 'Lê Hoài Uyên',
        unitName: 'Đội tìm kiếm',
        location: 'Nhà kho 5',
        recordedAt: '2026-03-14T09:15:00',
        photoCount: 2,
        category: 'TRAINING',
        isOwner: false,
        media: [
            { mediaId: 5, url: noteMediaPool[4] },
            { mediaId: 6, url: noteMediaPool[5] },
        ],
        tags: ['Huấn luyện', 'Nhà kho'],
    },
    {
        noteId: 8103,
        title: 'Kiểm tra sức khỏe định kỳ',
        content:
            'Kiểm tra cân nặng và tiêm phòng định kỳ cho Rocky. Trạng thái sức khỏe ổn định, không ghi nhận phản ứng bất thường sau tiêm. Đề xuất nghỉ vận động nặng 24 giờ.',
        dogId: 102,
        dogName: 'Bruno',
        dogCode: 'DK003',
        ownerId: 23,
        ownerName: 'Bác sĩ Thúy',
        unitName: 'Tổ y tế K9',
        location: 'Phòng khám K9',
        recordedAt: '2026-03-13T15:45:00',
        photoCount: 1,
        category: 'MEDICAL',
        isOwner: false,
        media: [{ mediaId: 7, url: noteMediaPool[1] }],
        tags: ['Y tế', 'Bruno'],
    },
    {
        noteId: 8104,
        title: 'Giám sát sự kiện cổng A',
        content:
            'Giám sát lưu lượng khách ra vào sự kiện tại cổng A. Luna phối hợp tốt với tổ an ninh vòng ngoài, giữ khoảng cách phù hợp và không phản ứng với tiếng loa công suất lớn.',
        dogId: 104,
        dogName: 'Luna',
        dogCode: 'K9-Luna',
        ownerId: 0,
        ownerName: 'Đỗ Công Tùng',
        unitName: 'Đội Alpha',
        location: 'Cổng A',
        recordedAt: '2026-03-12T18:00:00',
        photoCount: 3,
        category: 'SURVEILLANCE',
        isOwner: true,
        media: [
            { mediaId: 8, url: noteMediaPool[2] },
            { mediaId: 9, url: noteMediaPool[0] },
            { mediaId: 10, url: noteMediaPool[4] },
        ],
        tags: ['Giám sát', 'Sự kiện'],
    },
];

export const healthSessionStatusOptions: { key: 'ALL' | HealthSessionStatus; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Đang mở' },
    { key: 'MONITORING', label: 'Theo dõi' },
    { key: 'RESOLVED', label: 'Đã kết thúc' },
    { key: 'ESCALATED', label: 'Khẩn cấp' },
];

export const fieldNoteScopeOptions = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'MINE', label: 'Của tôi' },
    { key: 'DOG', label: 'Theo chó' },
] as const;

export const getDogDisplayName = (dog?: Pick<DogProfile, 'dogName' | 'dogCode'> | null) => {
    if (!dog) {
        return 'Chưa rõ';
    }

    return dog.dogName || dog.dogCode || 'Chưa rõ';
};
