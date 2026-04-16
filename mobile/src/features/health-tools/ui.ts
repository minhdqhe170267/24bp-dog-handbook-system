import type { SymptomCategory, SymptomUrgencyLevel } from '../../types/symptomChecker';
import type { WeightRecordStatus, WeightRecordSyncStatus } from '../../types/weightRecord';

export const healthToolsUi = {
    page: '#F3F8F5',
    surface: '#FFFFFF',
    border: '#D8E4DC',
    brand: '#18553A',
    brandStrong: '#103B29',
    accent: '#E2F3E8',
    textStrong: '#102218',
    textNormal: '#496254',
    textMuted: '#7A8F83',
    gold: '#F4B860',
    rose: '#F88D8D',
    sky: '#B8DBFF',
} as const;

export const symptomCategoryMeta = (category: SymptomCategory | 'ALL') => {
    switch (category) {
        case 'EATING':
            return { label: 'Ăn uống', color: '#8C5A18', bg: '#FBE7C8', icon: 'restaurant-outline' as const };
        case 'BEHAVIOR':
            return { label: 'Hành vi', color: '#2F5F9A', bg: '#DDEBFF', icon: 'sparkles-outline' as const };
        case 'PHYSICAL':
            return { label: 'Thể chất', color: '#1F6C4A', bg: '#DDF3E7', icon: 'fitness-outline' as const };
        case 'RESPIRATORY':
            return { label: 'Hô hấp', color: '#6D4AB8', bg: '#EADFFF', icon: 'pulse-outline' as const };
        case 'SKIN':
            return { label: 'Da và lông', color: '#9A5B2F', bg: '#FCE5D6', icon: 'water-outline' as const };
        case 'OTHER':
            return { label: 'Khác', color: '#5A6571', bg: '#EEF1F4', icon: 'ellipsis-horizontal-outline' as const };
        default:
            return { label: 'Tất cả', color: '#1D6A43', bg: '#DFF4E7', icon: 'apps-outline' as const };
    }
};

export const urgencyMeta = (urgency: SymptomUrgencyLevel | null | undefined) => {
    switch (String(urgency || '').toUpperCase()) {
        case 'CRITICAL':
            return { label: 'Nguy cấp', bg: '#FFE3E3', text: '#B53030' };
        case 'HIGH':
            return { label: 'Cao', bg: '#FFF0D9', text: '#A36A00' };
        case 'MEDIUM':
            return { label: 'Trung bình', bg: '#E6F0FF', text: '#0E5DA8' };
        default:
            return { label: 'Theo dõi', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const severityMeta = (severity: string | null | undefined) => {
    switch (String(severity || '').toUpperCase()) {
        case 'CRITICAL':
            return { label: 'Nguy cấp', bg: '#FFE3E3', text: '#B53030' };
        case 'HIGH':
            return { label: 'Nặng', bg: '#FFF0D9', text: '#A36A00' };
        case 'MEDIUM':
            return { label: 'Vừa', bg: '#E6F0FF', text: '#0E5DA8' };
        default:
            return { label: 'Nhẹ', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const weightStatusMeta = (status: WeightRecordStatus | string | null | undefined) => {
    switch (String(status || '').toUpperCase()) {
        case 'SEVERELY_UNDERWEIGHT':
            return { label: 'Thiếu cân nặng', bg: '#FFE3E3', text: '#B53030' };
        case 'UNDERWEIGHT':
            return { label: 'Thiếu cân', bg: '#FFF0D9', text: '#A36A00' };
        case 'OVERWEIGHT':
            return { label: 'Thừa cân', bg: '#E6F0FF', text: '#0E5DA8' };
        case 'OBESE':
            return { label: 'Béo phì', bg: '#F3DFFF', text: '#7B3FB2' };
        default:
            return { label: 'Ổn định', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const syncStatusMeta = (status: WeightRecordSyncStatus | string | null | undefined) => {
    switch (String(status || '').toUpperCase()) {
        case 'FAILED':
            return { label: 'Lỗi đồng bộ', bg: '#FFE3E3', text: '#B53030' };
        case 'CONFLICT':
            return { label: 'Xung đột', bg: '#FFF0D9', text: '#A36A00' };
        case 'PENDING':
            return { label: 'Chờ đồng bộ', bg: '#E6F0FF', text: '#0E5DA8' };
        default:
            return { label: 'Đã đồng bộ', bg: '#DFF4E7', text: '#1D6A43' };
    }
};

export const formatShortNumber = (value: number | null | undefined, suffix = '') => {
    if (value == null || Number.isNaN(Number(value))) {
        return '--';
    }

    return `${Number(value).toFixed(1)}${suffix}`;
};
