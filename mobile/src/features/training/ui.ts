export const trainingUi = {
    surface: '#FFFFFF',
    page: '#F4F7F5',
    textStrong: '#102218',
    textNormal: '#4E6356',
    textMuted: '#7C9084',
    brand: '#1F5A3A',
    brandSoft: '#DCEFE3',
    border: '#D6E0DA',
    methodAccent: '#2B6CB0',
    exerciseAccent: '#D9822B',
    roadmapAccent: '#2F7D4E',
    warnSoft: '#FFF2DD',
    dangerSoft: '#FFE6E6',
} as const;

export type StatusKey = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'UNKNOWN';

export const statusMeta: Record<StatusKey, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: '#EEF1F4', text: '#5A6571', label: 'Nháp' },
    PENDING: { bg: '#FFF2D8', text: '#9B6A00', label: 'Chờ duyệt' },
    APPROVED: { bg: '#DFF4E7', text: '#1D6A43', label: 'Đã duyệt' },
    PUBLISHED: { bg: '#E3F0FF', text: '#0E5DA8', label: 'Đã xuất bản' },
    REJECTED: { bg: '#FFE4E4', text: '#9F2B2B', label: 'Từ chối' },
    UNKNOWN: { bg: '#EEF1F4', text: '#5A6571', label: 'Không rõ' },
};

export type DifficultyKey = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'UNKNOWN';

export const difficultyMeta: Record<
    DifficultyKey,
    { bg: string; text: string; border: string; label: string; durationTone: string }
> = {
    BASIC: { bg: '#E7F7EE', text: '#1F7A4D', border: '#BFE8CF', label: 'Cơ bản', durationTone: '#1F7A4D' },
    INTERMEDIATE: {
        bg: '#FFF2DD',
        text: '#A86A09',
        border: '#F0D8A8',
        label: 'Trung bình',
        durationTone: '#A86A09',
    },
    ADVANCED: { bg: '#FFE6E6', text: '#B53030', border: '#F3B6B6', label: 'Nâng cao', durationTone: '#B53030' },
    UNKNOWN: { bg: '#EEF1F4', text: '#5A6571', border: '#D6E0DA', label: 'Không rõ', durationTone: '#5A6571' },
};

const imagePool = [
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80',
];

const fallbackHero = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80';

export const trainingImages = {
    hero: fallbackHero,
    methods: imagePool[1],
    exercises: imagePool[2],
    roadmaps: imagePool[5],
};

export const pickTrainingImage = (seed: number | string | null | undefined): string => {
    if (seed == null) {
        return fallbackHero;
    }

    const numericSeed = typeof seed === 'number'
        ? Math.abs(seed)
        : seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return imagePool[numericSeed % imagePool.length] ?? fallbackHero;
};

export const normalizeStatus = (status: string | null | undefined): StatusKey => {
    if (!status) {
        return 'UNKNOWN';
    }
    const normalized = status.toUpperCase();
    if (normalized in statusMeta) {
        return normalized as StatusKey;
    }
    return 'UNKNOWN';
};

export const normalizeDifficulty = (difficulty: string | null | undefined): DifficultyKey => {
    if (!difficulty) {
        return 'UNKNOWN';
    }
    const normalized = difficulty.toUpperCase();
    if (normalized in difficultyMeta) {
        return normalized as DifficultyKey;
    }
    return 'UNKNOWN';
};

export const splitToBullets = (text: string | null | undefined): string[] => {
    if (!text) {
        return [];
    }

    return text
        .split(/[\n.;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
};
