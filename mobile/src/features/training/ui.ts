import { Ionicons } from '@expo/vector-icons';

export const trainingUi = {
    surface: '#FFFFFF',
    page: '#F4F7F5',
    pageGlow: '#E8F2EC',
    textStrong: '#102218',
    textNormal: '#4E6356',
    textMuted: '#7C9084',
    brand: '#1F5A3A',
    brandSoft: '#DCEFE3',
    brandStripe: '#BFD8C7',
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
const stepLabel = 'Bước';
const stepMarkerRegex = /(^|[\s.;!?])((?:b(?:uoc|ước)?\s*\d+|step\s*\d+|b\d+)\s*[:.)-]?)/giu;
const numericStepRegex = /(^|[\s.;!?])(\d{1,2}\s*[:.)-]\s*)/g;
const genericStepRegex = /^(?:b(?:uoc|ước)?|step)\s*\d+$/iu;
const stepPrefixRegex = /^(?:b(?:uoc|ước)?|step|b)\s*(\d+)\s*[:.)-]?\s*(.*)$/iu;
const numberedPrefixRegex = /^(\d{1,2})\s*[:.)-]\s*(.*)$/;

export const trainingImages = {
    hero: fallbackHero,
    methods: imagePool[1],
    exercises: imagePool[2],
    specialties: imagePool[4],
    roadmaps: imagePool[5],
};

export const pickTrainingImage = (seed: number | string | null | undefined): string => {
    if (seed == null) {
        return fallbackHero;
    }

    const numericSeed =
        typeof seed === 'number'
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
        .split(/\r?\n+|[;•·]+|(?<!\b[A-Z])\.(?=\s+[A-ZÀ-ỹ0-9-])/u)
        .map((item) => item.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
        .filter(Boolean);
};

export type InstructionStep = {
    title: string;
    summary: string;
    detail: string;
};

type ToolIconName = keyof typeof Ionicons.glyphMap;

const dedupeList = (items: string[]) => Array.from(new Set(items));

const truncateText = (value: string, limit: number) => {
    if (value.length <= limit) {
        return value;
    }

    return `${value.slice(0, Math.max(limit - 1, 1)).trimEnd()}…`;
};

const tryParseJsonArray = (value: string | null | undefined): string[] | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
    } catch {
        return null;
    }

    return null;
};

const splitLooseList = (value: string | null | undefined): string[] => {
    const parsedArray = tryParseJsonArray(value);
    if (parsedArray) {
        return parsedArray;
    }

    if (!value) {
        return [];
    }

    return value
        .split(/\r?\n|[;|]+|,(?=\s*[\p{L}\d])/u)
        .map((item) => item.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
        .filter(Boolean);
};

const normalizeInstructionText = (value: string | null | undefined) =>
    (value || '')
        .replace(/[•·]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const splitByIndexedMarkers = (
    value: string,
    regex: RegExp,
    getStartOffset: (match: RegExpMatchArray) => number
): string[] => {
    const matches = Array.from(value.matchAll(regex));
    if (matches.length === 0) {
        return [];
    }

    return matches
        .map((match, index) => {
            const start = (match.index ?? 0) + getStartOffset(match);
            const end =
                index < matches.length - 1
                    ? (matches[index + 1].index ?? value.length) + getStartOffset(matches[index + 1])
                    : value.length;
            return value.slice(start, end).trim();
        })
        .filter(Boolean);
};

const extractHeadingAndDetail = (value: string) => {
    const cleaned = value.trim();
    const parts = cleaned.split(/[:\-–]\s+/, 2);

    if (parts.length === 2) {
        const heading = parts[0].trim();
        const detail = parts[1].trim();

        if (!genericStepRegex.test(heading) && heading.length >= 3 && heading.length <= 48 && detail.length >= 6) {
            return { heading, detail };
        }
    }

    return {
        heading: truncateText(cleaned, 34),
        detail: cleaned,
    };
};

const parseInstructionSegment = (segment: string, index: number): InstructionStep => {
    const raw = segment.trim();
    const explicitMatch = raw.match(stepPrefixRegex);
    const numberedMatch = raw.match(numberedPrefixRegex);
    const stepNumber = explicitMatch?.[1] || numberedMatch?.[1] || String(index + 1);
    const withoutMarker = explicitMatch?.[2]?.trim() || numberedMatch?.[2]?.trim() || raw;
    const normalizedDetail = withoutMarker.replace(/\s+/g, ' ').trim();
    const { heading, detail } = extractHeadingAndDetail(normalizedDetail || `${stepLabel} ${stepNumber}`);

    return {
        title: `${stepLabel} ${stepNumber}`,
        summary: heading || `${stepLabel} ${stepNumber}`,
        detail: detail || normalizedDetail || `${stepLabel} ${stepNumber}`,
    };
};

const buildInstructionStepsFromText = (instructions: string | null | undefined): InstructionStep[] => {
    const normalizedText = normalizeInstructionText(instructions);
    if (!normalizedText) {
        return [];
    }

    const labeledChunks = splitByIndexedMarkers(normalizedText, stepMarkerRegex, (match) => (match[1] || '').length);
    if (labeledChunks.length > 0) {
        return labeledChunks.map((item, index) => parseInstructionSegment(item, index));
    }

    const numericChunks = splitByIndexedMarkers(normalizedText, numericStepRegex, (match) => (match[1] || '').length);
    if (numericChunks.length > 1) {
        return numericChunks.map((item, index) => parseInstructionSegment(item, index));
    }

    const paragraphChunks = (instructions || '')
        .split(/\r?\n+|[;|]+/)
        .map((item) => item.replace(/^\s*[-*•]+\s*/, '').trim())
        .filter(Boolean);

    if (paragraphChunks.length > 1) {
        return paragraphChunks.map((item, index) => parseInstructionSegment(item, index));
    }

    return [parseInstructionSegment(normalizedText, 0)];
};

export const parseToolItems = (value: string | null | undefined): string[] => {
    return dedupeList(splitLooseList(value));
};

export const parseMediaUrls = (value: string | null | undefined): string[] => {
    return dedupeList(
        splitLooseList(value)
            .flatMap((item) => item.split(/\s+/))
            .map((item) => item.trim())
            .filter(Boolean)
    );
};

export const buildInstructionSteps = (instructions: string | null | undefined): InstructionStep[] => {
    const parsedArray = tryParseJsonArray(instructions);

    if (parsedArray && parsedArray.length > 0) {
        const steps = parsedArray.flatMap((item, index) => {
            const nestedSteps = buildInstructionStepsFromText(item);
            if (nestedSteps.length > 1) {
                return nestedSteps;
            }

            return [parseInstructionSegment(item, index)];
        });

        return steps.filter((step) => step.detail.length > 0);
    }

    return buildInstructionStepsFromText(instructions);
};

export const pickToolIcon = (tool: string | null | undefined): ToolIconName => {
    const normalized = (tool || '').toLowerCase();

    if (/(còi|whistle)/.test(normalized)) {
        return 'megaphone-outline';
    }
    if (/(dây|leash|xích)/.test(normalized)) {
        return 'git-branch-outline';
    }
    if (/(bóng|ball)/.test(normalized)) {
        return 'football-outline';
    }
    if (/(áo|giáp|vest|harness)/.test(normalized)) {
        return 'shield-outline';
    }
    if (/(chóp|cone|cọc)/.test(normalized)) {
        return 'triangle-outline';
    }
    if (/(rào|bar|jump|hurdle)/.test(normalized)) {
        return 'resize-outline';
    }
    if (/(khăn|mùi|scent)/.test(normalized)) {
        return 'flask-outline';
    }
    if (/(thưởng|snack|treat|food)/.test(normalized)) {
        return 'nutrition-outline';
    }

    return 'construct-outline';
};

export type EnrollmentStatusKey = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'WITHDRAWN' | 'UNKNOWN';

export const enrollmentStatusMeta: Record<
    EnrollmentStatusKey,
    { bg: string; text: string; label: string }
> = {
    ENROLLED: { bg: '#EEF3FF', text: '#3559C7', label: 'Đã ghi danh' },
    IN_PROGRESS: { bg: '#FFF2D8', text: '#9B6A00', label: 'Đang huấn luyện' },
    COMPLETED: { bg: '#DFF4E7', text: '#1D6A43', label: 'Đã hoàn thành' },
    SUSPENDED: { bg: '#FFE8D7', text: '#B45A12', label: 'Tạm dừng' },
    WITHDRAWN: { bg: '#FFE4E4', text: '#9F2B2B', label: 'Đã rút' },
    UNKNOWN: { bg: '#EEF1F4', text: '#5A6571', label: 'Không rõ' },
};

export type EnrollmentExerciseStatusKey =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'SKIPPED'
    | 'UNKNOWN';

export const enrollmentExerciseStatusMeta: Record<
    EnrollmentExerciseStatusKey,
    { bg: string; text: string; label: string }
> = {
    NOT_STARTED: { bg: '#EEF1F4', text: '#5A6571', label: 'Chưa bắt đầu' },
    IN_PROGRESS: { bg: '#FFF2D8', text: '#9B6A00', label: 'Đang thực hiện' },
    COMPLETED: { bg: '#DFF4E7', text: '#1D6A43', label: 'Đã hoàn thành' },
    SKIPPED: { bg: '#F2E8FF', text: '#6E43B8', label: 'Đã bỏ qua' },
    UNKNOWN: { bg: '#EEF1F4', text: '#5A6571', label: 'Không rõ' },
};

export const normalizeEnrollmentStatus = (
    status: string | null | undefined,
): EnrollmentStatusKey => {
    if (!status) {
        return 'UNKNOWN';
    }

    const normalized = status.toUpperCase();
    if (normalized in enrollmentStatusMeta) {
        return normalized as EnrollmentStatusKey;
    }

    return 'UNKNOWN';
};

export const normalizeEnrollmentExerciseStatus = (
    status: string | null | undefined,
): EnrollmentExerciseStatusKey => {
    if (!status) {
        return 'UNKNOWN';
    }

    const normalized = status.toUpperCase();
    if (normalized in enrollmentExerciseStatusMeta) {
        return normalized as EnrollmentExerciseStatusKey;
    }

    return 'UNKNOWN';
};

export const formatProgressPercent = (value: number | null | undefined) =>
    `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`;

export const formatTrainingRole = (value: string | null | undefined) => {
    if (!value) {
        return 'Tổng quát';
    }

    const normalized = value.trim().toUpperCase();
    const roleMap: Record<string, string> = {
        GENERAL: 'Tổng quát',
        FULL_TRAINING: 'Huấn luyện toàn phần',
        CARE_ONLY: 'Chăm sóc',
        PRIMARY: 'Phụ trách chính',
        SECONDARY: 'Phụ trách phụ',
        PATROL: 'Tuần tra',
        DETECTION: 'Phát hiện',
        TRACKING: 'Truy vết',
        SEARCH_AND_RESCUE: 'Tìm kiếm cứu nạn',
        EXPLOSIVE_DETECTION: 'Phát hiện chất nổ',
        NARCOTICS_DETECTION: 'Phát hiện ma túy',
        GUARD: 'Bảo vệ',
    };

    if (roleMap[normalized]) {
        return roleMap[normalized];
    }

    return value
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};
