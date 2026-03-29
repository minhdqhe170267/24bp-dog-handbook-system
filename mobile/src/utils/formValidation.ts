type TextFieldOptions = {
    label: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
};

type NumberFieldOptions = {
    label: string;
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
};

type DateFieldOptions = {
    label: string;
    required?: boolean;
    mustBeTodayOrFuture?: boolean;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const trimValue = (value: string) => value.trim();

export const trimToNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export const getCharacterCountLabel = (value: string, maxLength: number) =>
    `${trimValue(value).length}/${maxLength}`;

export const validateTextField = (value: string, options: TextFieldOptions): string | null => {
    const trimmed = trimValue(value);

    if (options.required && !trimmed) {
        return `${options.label} không được để trống.`;
    }

    if (!trimmed) {
        return null;
    }

    if (options.minLength != null && trimmed.length < options.minLength) {
        return `${options.label} cần ít nhất ${options.minLength} ký tự.`;
    }

    if (options.maxLength != null && trimmed.length > options.maxLength) {
        return `${options.label} tối đa ${options.maxLength} ký tự.`;
    }

    return null;
};

export const parseNumericInput = (value: string): number | null => {
    const trimmed = trimValue(value);
    if (!trimmed) {
        return null;
    }

    const normalized = trimmed.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const validateNumberField = (value: string, options: NumberFieldOptions): string | null => {
    const trimmed = trimValue(value);

    if (!trimmed) {
        return options.required ? `${options.label} là bắt buộc.` : null;
    }

    const parsed = parseNumericInput(trimmed);
    if (parsed == null) {
        return `${options.label} phải là số hợp lệ.`;
    }

    if (options.integer && !Number.isInteger(parsed)) {
        return `${options.label} phải là số nguyên.`;
    }

    if (options.min != null && parsed < options.min) {
        return `${options.label} phải lớn hơn hoặc bằng ${options.min}.`;
    }

    if (options.max != null && parsed > options.max) {
        return `${options.label} phải nhỏ hơn hoặc bằng ${options.max}.`;
    }

    return null;
};

export const isValidDateYmd = (value: string) => {
    const trimmed = trimValue(value);
    if (!DATE_PATTERN.test(trimmed)) {
        return false;
    }

    const [year, month, day] = trimmed.split('-').map(Number);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    return (
        candidate.getUTCFullYear() === year &&
        candidate.getUTCMonth() === month - 1 &&
        candidate.getUTCDate() === day
    );
};

export const validateDateField = (value: string, options: DateFieldOptions): string | null => {
    const trimmed = trimValue(value);

    if (!trimmed) {
        return options.required ? `${options.label} là bắt buộc.` : null;
    }

    if (!isValidDateYmd(trimmed)) {
        return `${options.label} cần theo định dạng YYYY-MM-DD.`;
    }

    if (options.mustBeTodayOrFuture) {
        const today = new Date();
        const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
            today.getDate(),
        ).padStart(2, '0')}`;
        if (trimmed < todayYmd) {
            return `${options.label} nên từ hôm nay trở đi.`;
        }
    }

    return null;
};

export const formatDisplayDateTime = (value: string | Date | null | undefined) => {
    const date =
        value instanceof Date
            ? value
            : value
              ? new Date(value)
              : null;

    if (!date || Number.isNaN(date.getTime())) {
        return 'Chưa xác định';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}/${year}`;
};
