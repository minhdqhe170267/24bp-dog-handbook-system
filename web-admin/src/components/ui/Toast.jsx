import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { buildApiErrorToast, normalizeApiError } from '../../services/apiError';

const ToastContext = createContext(null);

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const styles = {
    success: 'border-success/30 bg-success/10 text-success',
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    info: 'border-info/30 bg-info/10 text-info',
};

const defaultTitles = {
    success: 'Thành công',
    error: 'Thao tác chưa thành công',
    warning: 'Lưu ý',
    info: 'Thông tin',
};

const defaultTimeoutByType = {
    success: 3200,
    info: 4200,
    warning: 5200,
    error: 6500,
};

const normalizeText = (value) => String(value || '').trim();

const descriptionToKey = (description) => {
    if (Array.isArray(description)) return description.map((item) => normalizeText(item)).join('|');
    return normalizeText(description);
};

const resolveTitleFromError = (errorPayload, fallbackTitle) => {
    const normalized = normalizeApiError(errorPayload);
    return buildApiErrorToast(normalized, fallbackTitle);
};

const normalizeToastInput = (type, payload, options = {}) => {
    const fallbackTitle = options?.title || defaultTitles[type];

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const hasExplicitContent =
            Object.prototype.hasOwnProperty.call(payload, 'title') ||
            Object.prototype.hasOwnProperty.call(payload, 'description') ||
            Object.prototype.hasOwnProperty.call(payload, 'messages');

        if (hasExplicitContent) {
            const title = normalizeText(payload.title || fallbackTitle);
            const description =
                payload.description !== undefined
                    ? payload.description
                    : payload.messages !== undefined
                        ? payload.messages
                        : '';
            return {
                title,
                description,
                dedupeKey: normalizeText(payload.dedupeKey),
            };
        }

        if (type === 'error') {
            const errorToast = resolveTitleFromError(payload, fallbackTitle);
            return {
                title: errorToast.title,
                description: errorToast.description,
                dedupeKey: errorToast.dedupeKey,
            };
        }

        const title = normalizeText(fallbackTitle);
        const description = normalizeText(payload.message || '');
        return { title, description, dedupeKey: '' };
    }

    if (Array.isArray(payload)) {
        return {
            title: normalizeText(fallbackTitle),
            description: payload.filter((item) => normalizeText(item)),
            dedupeKey: '',
        };
    }

    return {
        title: normalizeText(fallbackTitle),
        description: normalizeText(payload),
        dedupeKey: '',
    };
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    const removeToast = useCallback((id) => {
        const existingTimer = timersRef.current.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const scheduleDismiss = useCallback((id, durationMs) => {
        const currentTimer = timersRef.current.get(id);
        if (currentTimer) {
            clearTimeout(currentTimer);
        }
        const timer = setTimeout(() => removeToast(id), durationMs);
        timersRef.current.set(id, timer);
    }, [removeToast]);

    const addToast = useCallback((type, payload, options = {}) => {
        const normalized = normalizeToastInput(type, payload, options);
        const hasDescription = Array.isArray(normalized.description)
            ? normalized.description.length > 0
            : Boolean(normalizeText(normalized.description));
        if (!normalized.title && !hasDescription) return;

        const dedupeKey = normalized.dedupeKey || `${type}:${normalized.title}:${descriptionToKey(normalized.description)}`;
        const durationMs =
            Number.isFinite(options?.durationMs)
                ? options.durationMs
                : defaultTimeoutByType[type] || 4200;

        setToasts((prev) => {
            const duplicate = prev.find((item) => item.dedupeKey === dedupeKey);
            if (duplicate) {
                scheduleDismiss(duplicate.id, durationMs);
                return prev;
            }

            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const next = [
                ...prev,
                {
                    id,
                    type,
                    title: normalized.title,
                    description: normalized.description,
                    dedupeKey,
                },
            ];
            scheduleDismiss(id, durationMs);
            return next;
        });
    }, [scheduleDismiss]);

    useEffect(() => () => {
        timersRef.current.forEach((timerId) => clearTimeout(timerId));
        timersRef.current.clear();
    }, []);

    const toast = useMemo(() => ({
        success: (payload, options) => addToast('success', payload, options),
        error: (payload, options) => addToast('error', payload, options),
        warning: (payload, options) => addToast('warning', payload, options),
        info: (payload, options) => addToast('info', payload, options),
    }), [addToast]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[min(92vw,26rem)] pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => {
                        const Icon = icons[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                                className={`w-full pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-elevated bg-card ${styles[t.type]}`}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold leading-snug">{t.title}</p>
                                    {Array.isArray(t.description) ? (
                                        <ul className="mt-1 list-disc pl-5 text-xs leading-relaxed opacity-95">
                                            {t.description.map((item, index) => (
                                                <li key={`${t.id}-desc-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : t.description ? (
                                        <p className="mt-1 text-xs leading-relaxed opacity-95">{t.description}</p>
                                    ) : null}
                                </div>
                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="h-5 w-5 flex items-center justify-center hover:opacity-70 cursor-pointer bg-transparent border-0 flex-shrink-0"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
