import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

    const toast = {
        success: (msg) => addToast('success', msg),
        error: (msg) => addToast('error', msg),
        warning: (msg) => addToast('warning', msg),
        info: (msg) => addToast('info', msg),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
                <AnimatePresence>
                    {toasts.map((t) => {
                        const Icon = icons[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={`flex items-start gap-3 p-3.5 rounded-lg border shadow-elevated bg-card ${styles[t.type]}`}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p className="text-sm flex-1 font-medium">{t.message}</p>
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
