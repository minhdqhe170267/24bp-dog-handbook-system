import { Ionicons } from '@expo/vector-icons';
import type { EntityType } from '../../database/types';
import type {
    SyncConflictFieldChoice,
    SyncConflictResolutionType,
    SyncServerConflictDetail,
} from '../../types/sync';

export interface DisplayPair {
    rawKey: string;
    key: string;
    value: string;
}

const ENTITY_LABELS: Partial<Record<EntityType, string>> = {
    field_note: 'Nhật ký thực địa',
    health_record: 'Hồ sơ sức khỏe',
    health_session: 'Phiên theo dõi sức khỏe',
    session_follow_up: 'Theo dõi sau phiên',
    content_suggestion: 'Góp ý nội dung',
    weight_assessment: 'Đánh giá cân nặng',
    operation_report: 'Báo cáo công tác',
    diagnosis_record: 'Bản ghi chẩn đoán',
};

const ENTITY_ICONS: Partial<Record<EntityType, React.ComponentProps<typeof Ionicons>['name']>> = {
    field_note: 'document-text',
    health_record: 'medkit',
    health_session: 'pulse',
    session_follow_up: 'calendar',
    content_suggestion: 'chatbubble-ellipses',
    weight_assessment: 'barbell',
    operation_report: 'clipboard',
    diagnosis_record: 'search',
};

const CONFLICT_STATUS_META = {
    PENDING: {
        label: 'Đang chờ xử lý',
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
        textColor: '#C57A00',
    },
    RESOLVED: {
        label: 'Đã giải quyết',
        backgroundColor: 'rgba(34, 197, 94, 0.14)',
        textColor: '#15803D',
    },
    DISMISSED: {
        label: 'Giữ bản máy chủ',
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        textColor: '#2563EB',
    },
} as const;

const pad = (value: number) => String(value).padStart(2, '0');

export const formatDateTime = (value: string | null | undefined) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Chưa cập nhật';
    }

    return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatShortDateTime = (value: string | null | undefined) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Chưa cập nhật';
    }

    return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

export const formatDuration = (durationMs: number) => `${(durationMs / 1000).toFixed(1)}s`;

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (typeof error === 'object' && error && 'message' in error) {
        return String((error as { message?: unknown }).message || 'Đã xảy ra lỗi không xác định.');
    }

    return 'Đã xảy ra lỗi không xác định.';
};

const capitalizeWords = (value: string) =>
    value
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

export const humanizeKey = (value: string) => capitalizeWords(value.replace(/_/g, ' '));

export const formatEntityLabel = (entityType: string) =>
    ENTITY_LABELS[entityType as EntityType] ?? humanizeKey(entityType);

export const getEntityIcon = (entityType: string): React.ComponentProps<typeof Ionicons>['name'] =>
    ENTITY_ICONS[entityType as EntityType] ?? 'layers';

export const stringifyConflictValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '—';
    }

    if (Array.isArray(value)) {
        return value.map((item) => stringifyConflictValue(item)).join(', ');
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    if (typeof value === 'boolean') {
        return value ? 'Có' : 'Không';
    }

    return String(value);
};

export const toDisplayPairs = (value: Record<string, unknown> | string | null | undefined): DisplayPair[] => {
    if (value == null) {
        return [{ rawKey: 'data', key: 'Dữ liệu', value: '—' }];
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return Object.entries(parsed).map(([key, pairValue]) => ({
                    rawKey: key,
                    key: humanizeKey(key),
                    value: stringifyConflictValue(pairValue),
                }));
            }

            return [{ rawKey: 'data', key: 'Dữ liệu', value: stringifyConflictValue(parsed) }];
        } catch {
            return [{ rawKey: 'data', key: 'Dữ liệu', value }];
        }
    }

    return Object.entries(value).map(([key, pairValue]) => ({
        rawKey: key,
        key: humanizeKey(key),
        value: stringifyConflictValue(pairValue),
    }));
};

export const getConflictStatusMeta = (status: string) =>
    CONFLICT_STATUS_META[status as keyof typeof CONFLICT_STATUS_META] ?? CONFLICT_STATUS_META.PENDING;

export const getResolutionLabel = (type: SyncConflictResolutionType | null | undefined) => {
    switch (type) {
        case 'KEEP_SERVER':
            return 'Giữ bản máy chủ';
        case 'KEEP_LOCAL':
            return 'Ưu tiên bản di động';
        case 'MERGED':
            return 'Bản hợp nhất';
        default:
            return 'Chưa chọn cách xử lý';
    }
};

export const buildMergedConflictData = (
    detail: SyncServerConflictDetail,
    selections: Record<string, SyncConflictFieldChoice>,
) => {
    const base: Record<string, unknown> = {
        ...(detail.serverData || {}),
    };

    Object.entries(detail.localData || {}).forEach(([key, value]) => {
        if (!(key in base)) {
            base[key] = value;
        }
    });

    (detail.conflictedFields || []).forEach((field) => {
        const choice = selections[field] || 'server';
        base[field] = choice === 'local'
            ? detail.localData?.[field]
            : detail.serverData?.[field];
    });

    return base;
};
