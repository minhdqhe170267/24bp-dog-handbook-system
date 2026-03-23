import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/utils';

const FilterSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Chọn...',
    className,
    buttonClassName,
    menuClassName,
    optionClassName,
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex items-center justify-between gap-2 h-9 px-3 border border-border rounded-lg text-sm bg-background outline-none cursor-pointer transition-all duration-200 min-w-[120px] text-foreground',
                    'hover:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:border-accent',
                    open && 'ring-2 ring-accent/20 border-accent',
                    buttonClassName
                )}
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
            </button>

            {open && (
                <div className={cn('absolute top-full left-0 mt-1 z-50 min-w-full w-max bg-card border border-border rounded-lg shadow-elevated py-1 animate-fade-in', menuClassName)}>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors duration-150 cursor-pointer',
                                value === option.value
                                    ? 'text-accent font-medium bg-accent/5'
                                    : 'text-foreground hover:bg-muted/50',
                                optionClassName
                            )}
                        >
                            <span className={cn('h-4 w-4 flex items-center justify-center flex-shrink-0', value !== option.value && 'invisible')}>
                                <Check className="h-3.5 w-3.5 text-accent" />
                            </span>
                            <span className="whitespace-nowrap">{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterSelect;
