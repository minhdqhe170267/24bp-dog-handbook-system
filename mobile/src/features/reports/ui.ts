import type { OperationReportItem } from '../../types/report';

export const reportUi = {
    page: '#F5F8F3',
    surface: '#FFFFFF',
    border: '#D9E3DA',
    textStrong: '#11221A',
    textNormal: '#4E6357',
    textMuted: '#7C9084',
    brand: '#214E3A',
    brandSoft: '#E1F1E7',
    trainingSoft: '#E8F1FF',
    trainingText: '#295F9E',
    healthSoft: '#FFF1DE',
    healthText: '#A46400',
    pendingSoft: '#FFF4DD',
    pendingText: '#9A6700',
    syncedSoft: '#E5F5EC',
    syncedText: '#1E6C43',
    failedSoft: '#FFE8E8',
    failedText: '#B53A3A',
} as const;

export const reportTypeMeta = (type: string | null | undefined) => {
    switch (String(type || '').toUpperCase()) {
        case 'TRAINING':
            return { label: 'Huấn luyện', bg: reportUi.trainingSoft, text: reportUi.trainingText };
        case 'HEALTH':
            return { label: 'Sức khỏe', bg: reportUi.healthSoft, text: reportUi.healthText };
        default:
            return { label: 'Khác', bg: '#EEF2F1', text: reportUi.textNormal };
    }
};

export const reportSyncMeta = (status: string | null | undefined) => {
    switch (String(status || '').toUpperCase()) {
        case 'PENDING':
            return { label: 'Chờ đồng bộ', bg: reportUi.pendingSoft, text: reportUi.pendingText };
        case 'FAILED':
            return { label: 'Lỗi đồng bộ', bg: reportUi.failedSoft, text: reportUi.failedText };
        case 'CONFLICT':
            return { label: 'Có xung đột', bg: reportUi.failedSoft, text: reportUi.failedText };
        default:
            return { label: 'Đã đồng bộ', bg: reportUi.syncedSoft, text: reportUi.syncedText };
    }
};

export const formatReportDate = (value: string | null | undefined) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        const [year, month, day] = value.split('T')[0].split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }
        return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
};

export const formatReportDateTime = (value: string | null | undefined) => {
    if (!value) {
        return 'Chưa cập nhật';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const buildReportExcerpt = (item: OperationReportItem) => {
    const text = (item.reportContent || item.metadata || '').replace(/\s+/g, ' ').trim();
    if (!text) {
        return 'Báo cáo này chưa có phần mô tả dài. Mở chi tiết để bổ sung nội dung hoặc siêu dữ liệu.';
    }

    if (text.length <= 148) {
        return text;
    }

    return `${text.slice(0, 147).trimEnd()}...`;
};

export const parseMetadataObject = (value: string | null | undefined): Record<string, unknown> | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
};
