import { cn } from '../../../utils/utils';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xử lý',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  RESOLVED: {
    label: 'Đã xử lý',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  DISMISSED: {
    label: 'Đã bỏ qua',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25',
  },
};

const ConflictStatusTag = ({ status }) => {
  const normalized = String(status || 'PENDING').trim().toUpperCase();
  const config = STATUS_CONFIG[normalized] || {
    label: normalized || '—',
    className: 'bg-muted text-muted-foreground border-border/70',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
        config.className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
};

export default ConflictStatusTag;
