import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../utils/utils';

const Modal = ({ open, onClose, title, children, footer, width = 600 }) => {
    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="relative bg-card rounded-xl shadow-elevated border border-border/60 z-10 max-h-[85vh] flex flex-col"
                        style={{ width, maxWidth: 'calc(100vw - 32px)' }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                            <button
                                onClick={onClose}
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer bg-transparent border-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-4 overflow-y-auto flex-1 scrollbar-thin">
                            {children}
                        </div>
                        {footer && (
                            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const FormField = ({ label, required, error, children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5 text-foreground">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
);

const FormInput = ({ className = '', ...props }) => (
    <input
        className={cn('w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card', className)}
        {...props}
    />
);

const FormTextarea = ({ className = '', rows = 3, ...props }) => (
    <textarea
        rows={rows}
        className={cn('w-full px-3 py-2 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card resize-y', className)}
        {...props}
    />
);

const FormSelect = ({
    options = [],
    className = '',
    placeholder = 'Chọn...',
    value,
    onChange,
    disabled = false,
    name,
    id,
    ...props
}) => {
    const ref = useRef(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const normalizedValue = value ?? '';
    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(normalizedValue)),
        [options, normalizedValue]
    );
    const selectedLabel = selectedOption?.label || placeholder;

    const emitChange = (nextValue) => {
        if (!onChange) return;
        onChange({
            target: {
                value: nextValue,
                name,
                id,
            },
        });
    };

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cn(
                    'w-full h-10 px-3 border border-input rounded-lg text-sm outline-none transition-all bg-card cursor-pointer',
                    'flex items-center justify-between gap-2 text-left',
                    'hover:border-accent/50 focus:border-accent/50 focus:ring-2 focus:ring-accent/10',
                    open && 'ring-2 ring-accent/10 border-accent/50',
                    disabled && 'opacity-60 cursor-not-allowed'
                )}
                onClick={() => !disabled && setOpen((prev) => !prev)}
            >
                <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>{selectedLabel}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </button>

            {open && !disabled && (
                <div className="absolute top-full left-0 mt-1 z-50 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-elevated py-1">
                    {placeholder && (
                        <button
                            type="button"
                            className={cn(
                                'w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2',
                                normalizedValue === '' ? 'text-accent bg-accent/5' : 'text-muted-foreground hover:bg-muted/50'
                            )}
                            onClick={() => {
                                emitChange('');
                                setOpen(false);
                            }}
                        >
                            <span className={cn('h-4 w-4 flex items-center justify-center', normalizedValue !== '' && 'invisible')}>
                                <Check className="h-3.5 w-3.5 text-accent" />
                            </span>
                            <span className="truncate">{placeholder}</span>
                        </button>
                    )}
                    {options.map((opt) => {
                        const optionValue = opt.value ?? '';
                        const isSelected = String(optionValue) === String(normalizedValue);
                        return (
                            <button
                                key={String(opt.value)}
                                type="button"
                                className={cn(
                                    'w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2',
                                    isSelected ? 'text-accent bg-accent/5' : 'text-foreground hover:bg-muted/50'
                                )}
                                onClick={() => {
                                    emitChange(optionValue);
                                    setOpen(false);
                                }}
                            >
                                <span className={cn('h-4 w-4 flex items-center justify-center', !isSelected && 'invisible')}>
                                    <Check className="h-3.5 w-3.5 text-accent" />
                                </span>
                                <span className="truncate">{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <input type="hidden" name={name} value={normalizedValue} {...props} />
        </div>
    );
};

const FormNumberInput = ({ className = '', ...props }) => (
    <input
        type="number"
        className={cn('w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card', className)}
        {...props}
    />
);

const FormSwitch = ({ checked, onChange, label }) => (
    <label className="inline-flex items-center gap-2 cursor-pointer">
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 border-0 cursor-pointer',
                checked ? 'bg-accent' : 'bg-muted'
            )}
        >
            <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm',
                checked ? 'translate-x-6' : 'translate-x-1'
            )} />
        </button>
        {label && <span className="text-sm">{label}</span>}
    </label>
);

const Button = ({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) => {
    const variants = {
        primary: 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-none',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-card text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
    };
    const sizes = {
        sm: 'h-8 px-3 text-xs gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                variants[variant], sizes[size], className
            )}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
};

const ConfirmDialog = ({ open, onClose, title, description, onConfirm, confirmLabel = 'Xác nhận', variant = 'destructive', loading }) => (
    <Modal open={open} onClose={onClose} title={title} width={420} footer={
        <>
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
    }>
        <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
);

const StatusBadge = ({ status }) => {
    const styles = {
        DRAFT: 'bg-muted text-muted-foreground',
        PUBLISHED: 'bg-success/10 text-success',
        ACTIVE: 'bg-success/10 text-success',
        INACTIVE: 'bg-muted text-muted-foreground',
        MILD: 'bg-success/10 text-success',
        MODERATE: 'bg-warning/10 text-warning',
        SEVERE: 'bg-destructive/10 text-destructive',
        CRITICAL: 'bg-destructive/15 text-destructive',
        BASIC: 'bg-success/10 text-success',
        INTERMEDIATE: 'bg-warning/10 text-warning',
        ADVANCED: 'bg-destructive/10 text-destructive',
        LOW: 'bg-success/10 text-success',
        MEDIUM: 'bg-info/10 text-info',
        HIGH: 'bg-warning/10 text-warning',
        VERY_HIGH: 'bg-destructive/10 text-destructive',
        SMALL: 'bg-info/10 text-info',
        LARGE: 'bg-warning/10 text-warning',
        GIANT: 'bg-destructive/10 text-destructive',
    };

    const labels = {
        DRAFT: 'Nháp',
        PUBLISHED: 'Đã xuất bản',
        ACTIVE: 'Hoạt động',
        INACTIVE: 'Ngừng hoạt động',
        MILD: 'Nhẹ',
        MODERATE: 'Trung bình',
        SEVERE: 'Nặng',
        CRITICAL: 'Nguy hiểm',
        BASIC: 'Cơ bản',
        INTERMEDIATE: 'Trung cấp',
        ADVANCED: 'Nâng cao',
        LOW: 'Thấp',
        MEDIUM: 'Trung bình',
        HIGH: 'Cao',
        VERY_HIGH: 'Rất cao',
        SMALL: 'Nhỏ',
        LARGE: 'Lớn',
        GIANT: 'Khổng lồ',
    };

    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            styles[status] || 'bg-muted text-muted-foreground'
        )}>
            {labels[status] || status}
        </span>
    );
};

export { Modal, FormField, FormInput, FormTextarea, FormSelect, FormNumberInput, FormSwitch, Button, ConfirmDialog, StatusBadge };
