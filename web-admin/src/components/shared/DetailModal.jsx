import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/utils';
import { formatDetailEnumValue } from '../../utils/enumLabels';

const DetailModal = ({ open, onClose, title, children, size = 'md' }) => {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        if (open) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open, onClose]);

    if (!open) return null;

    const sizeClass = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
            <div className={cn('relative bg-card rounded-xl border border-border shadow-elevated w-full animate-scale-in overflow-hidden', sizeClass)}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Detail view - list of label-value pairs
export const DetailView = ({ fields, data }) => {
    if (!data) return null;
    return (
        <div className="space-y-3">
            {fields.map((f) => {
                const rawValue = data[f.key];
                const displayValue = formatDetailEnumValue(f.key, rawValue);
                return (
                <div key={f.key} className={f.type === 'textarea' ? '' : 'flex items-start gap-2'}>
                    <span className="text-sm font-medium text-muted-foreground min-w-[140px] flex-shrink-0">{f.label}:</span>
                    {f.type === 'textarea' ? (
                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{data[f.key] || '-'}</p>
                    ) : f.render ? (
                        <span className="text-sm text-foreground">{f.render(data)}</span>
                    ) : (
                        <span className="text-sm text-foreground">{displayValue}</span>
                    )}
                </div>
                );
            })}
        </div>
    );
};

// Edit form
export const EditForm = ({ fields, data, onSubmit, onCancel, loading }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const result = {};
        fields.forEach(f => {
            result[f.key] = formData.get(f.key) || '';
        });
        onSubmit(result);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
                <div key={f.key}>
                    <label className="block text-sm font-medium text-foreground mb-1">{f.label} {f.required && <span className="text-destructive">*</span>}</label>
                    {f.type === 'select' ? (
                        <select name={f.key} defaultValue={data?.[f.key] || f.defaultValue || ''} required={f.required}
                            className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    ) : f.type === 'textarea' ? (
                        <textarea name={f.key} defaultValue={data?.[f.key] || ''} rows={3} required={f.required} maxLength={f.maxLength || 255}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                    ) : f.type === 'number' ? (
                        <input type="number" name={f.key} defaultValue={data?.[f.key] || ''} required={f.required}
                            className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    ) : (
                        <input type="text" name={f.key} defaultValue={data?.[f.key] || ''} required={f.required} maxLength={f.maxLength || 255} placeholder={f.placeholder || ''}
                            className="w-full h-9 px-3 border border-border rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    )}
                </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50">
                    {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
            </div>
        </form>
    );
};

export default DetailModal;
