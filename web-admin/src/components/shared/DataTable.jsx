import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Check, Loader2, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/utils';

const PageSizeSelect = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const sizes = [10, 20, 50];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex items-center justify-between gap-1.5 h-8 px-2.5 border border-border rounded-md text-xs bg-background outline-none cursor-pointer transition-all duration-200 min-w-[52px] text-foreground',
                    'hover:border-accent/50',
                    open && 'ring-2 ring-accent/20 border-accent'
                )}
            >
                <span>{value}</span>
                <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[80px] bg-card border border-border rounded-lg shadow-elevated py-1 animate-fade-in">
                    {sizes.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => { onChange(s); setOpen(false); }}
                            className={cn(
                                'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors duration-150 cursor-pointer',
                                value === s ? 'text-accent font-medium bg-accent/5' : 'text-foreground hover:bg-muted/50'
                            )}
                        >
                            <span className={cn('h-3.5 w-3.5 flex items-center justify-center flex-shrink-0', value !== s && 'invisible')}>
                                <Check className="h-3 w-3 text-accent" />
                            </span>
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const DataTable = ({
    columns, data, loading, page = 0, pageSize = 10,
    totalItems = 0, onPageChange, onPageSizeChange,
    emptyMessage = 'Không có dữ liệu', emptyIcon,
}) => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                {emptyIcon || <Inbox className="h-12 w-12 opacity-40" />}
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted/50">
                            {columns.map((col) => (
                                <th key={col.key} className={cn(
                                    'text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3',
                                    col.className
                                )}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <motion.tr
                                key={row.id || row.breedId || row.diseaseId || row.medicationId || row.rationId || row.methodId || row.exerciseId || row.roadmapId || row.symptomId || i}
                                className="border-t border-border/40 hover:bg-muted/30 transition-colors duration-150"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3 text-sm', col.className)}>
                                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {onPageChange && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Hiển thị</span>
                        <PageSizeSelect value={pageSize} onChange={(s) => onPageSizeChange?.(s)} />
                        <span>/ {totalItems} kết quả</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {[
                            { icon: ChevronsLeft, disabled: page === 0, onClick: () => onPageChange(0) },
                            { icon: ChevronLeft, disabled: page === 0, onClick: () => onPageChange(page - 1) },
                        ].map((btn, i) => {
                            const BtnIcon = btn.icon;
                            return (
                                <button key={i} className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background cursor-pointer"
                                    disabled={btn.disabled} onClick={btn.onClick}>
                                    <BtnIcon className="h-3.5 w-3.5" />
                                </button>
                            );
                        })}
                        <span className="text-xs mx-3 text-muted-foreground font-medium">
                            {page + 1} / {totalPages}
                        </span>
                        {[
                            { icon: ChevronRight, disabled: page >= totalPages - 1, onClick: () => onPageChange(page + 1) },
                            { icon: ChevronsRight, disabled: page >= totalPages - 1, onClick: () => onPageChange(totalPages - 1) },
                        ].map((btn, i) => {
                            const BtnIcon = btn.icon;
                            return (
                                <button key={i} className="h-8 w-8 flex items-center justify-center border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-background cursor-pointer"
                                    disabled={btn.disabled} onClick={btn.onClick}>
                                    <BtnIcon className="h-3.5 w-3.5" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
