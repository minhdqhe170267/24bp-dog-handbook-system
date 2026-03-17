import { DogAssignment, DogProfile, HealthRecord } from '../../types/dogManagement';
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
} as const;

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

export const pickDogImage = (seed: number | string | null | undefined): string => {
    if (seed == null) {
        return imagePool[0];
    }

    const numericSeed =
        typeof seed === 'number'
            ? Math.abs(seed)
            : seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return imagePool[numericSeed % imagePool.length] ?? imagePool[0];
};

export const pickDogBackupImage = (seed: number | string | null | undefined): string => {
    if (seed == null) {
        return backupImagePool[0];
    }

    const numericSeed =
        typeof seed === 'number'
            ? Math.abs(seed)
            : seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return backupImagePool[numericSeed % backupImagePool.length] ?? backupImagePool[0];
};

const isLocalDevHost = (url: string) => {
    return /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url);
};

export const resolveDogImageUrl = (
    imageUrl: string | null | undefined,
    seed: number | string | null | undefined
): string => {
    const fallback = pickDogImage(seed);
    const raw = (imageUrl || '').trim();

    if (!raw) {
        return fallback;
    }

    // If backend returns a local-only host, fallback to a public placeholder.
    if (isLocalDevHost(raw)) {
        return fallback;
    }

    // If backend returns relative image path, prepend API host.
    if (raw.startsWith('/')) {
        const apiOrigin = API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/i, '');
        return `${apiOrigin}${raw}`;
    }

    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    return fallback;
};

export const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) {
        return 'Chưa rõ';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
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
    if (!iso) {
        return 'Chưa rõ';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        const parts = iso.split('T')[0];
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
            return { label: 'Phụ', bg: '#E3F0FF', text: '#0E5DA8' };
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

export const stringifyWeight = (weight: number | null | undefined) => {
    if (weight == null || Number.isNaN(Number(weight))) {
        return 'Chưa cập nhật';
    }
    return `${Number(weight).toFixed(1)} kg`;
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

export const fallbackDogs: DogProfile[] = [
    {
        dogId: 101,
        dogCode: 'D001',
        dogName: 'Alpha',
        breedName: 'Berger Bỉ Malinois',
        ageMonths: 48,
        currentWeightKg: 32,
        status: 'ACTIVE',
    },
    {
        dogId: 102,
        dogCode: 'D002',
        dogName: 'Bravo',
        breedName: 'Golden Retriever',
        ageMonths: 36,
        currentWeightKg: 28,
        status: 'ACTIVE',
    },
    {
        dogId: 103,
        dogCode: 'D003',
        dogName: 'Kilo',
        breedName: 'Belgian Malinois',
        ageMonths: 60,
        currentWeightKg: 30,
        status: 'ACTIVE',
    },
    {
        dogId: 104,
        dogCode: 'D004',
        dogName: 'Sierra',
        breedName: 'Beagle',
        ageMonths: 24,
        currentWeightKg: 12,
        status: 'INACTIVE',
    },
];

export const fallbackAssignments: DogAssignment[] = [
    {
        assignmentId: 901,
        dogId: 101,
        dogName: 'Alpha',
        dogCode: 'D001',
        trainerId: 12,
        trainerName: 'Nguyễn Văn Cường',
        assignmentType: 'PRIMARY',
        startDate: '2026-03-01',
        isActive: true,
        notes: 'Theo dõi nền tảng tuần tra và phản xạ khẩu lệnh.',
    },
    {
        assignmentId: 902,
        dogId: 103,
        dogName: 'Kilo',
        dogCode: 'D003',
        trainerId: 12,
        trainerName: 'Nguyễn Văn Cường',
        assignmentType: 'TEMPORARY',
        startDate: '2026-03-05',
        endDate: '2026-03-26',
        isActive: true,
        notes: 'Bổ sung bài tập vượt vật cản.',
    },
];

export const fallbackHealthRecords: HealthRecord[] = [
    {
        recordId: 3001,
        dogId: 101,
        dogName: 'Alpha',
        dogCode: 'D001',
        examinerName: 'Bác sĩ quân y Trần Hải',
        examinationDate: '2026-03-15T09:30:00',
        weightKg: 65,
        diagnosis: 'Sức khỏe ổn định, chỉ số BMI bình thường.',
        temperatureC: 38.4,
        appetiteLevel: 'NORMAL',
        activityLevel: 'NORMAL',
        fecesStatus: 'NORMAL',
        nextCheckupDate: '2026-03-22',
    },
    {
        recordId: 3002,
        dogId: 102,
        dogName: 'Bravo',
        dogCode: 'D002',
        examinerName: 'Bác sĩ quân y Trần Hải',
        examinationDate: '2026-03-12T11:15:00',
        weightKg: 64.5,
        diagnosis: 'Kiểm tra huyết áp đột ngột, kết quả bình thường.',
        temperatureC: 38.5,
        appetiteLevel: 'NORMAL',
        activityLevel: 'LOW',
        fecesStatus: 'NORMAL',
    },
    {
        recordId: 3003,
        dogId: 103,
        dogName: 'Kilo',
        dogCode: 'D003',
        examinerName: 'Bác sĩ quân y Trần Hải',
        examinationDate: '2026-03-10T14:00:00',
        weightKg: 65.2,
        diagnosis: 'Xét nghiệm máu định kỳ, thể lực tốt.',
        temperatureC: 38.3,
        appetiteLevel: 'INCREASED',
        activityLevel: 'NORMAL',
        fecesStatus: 'NORMAL',
    },
];
