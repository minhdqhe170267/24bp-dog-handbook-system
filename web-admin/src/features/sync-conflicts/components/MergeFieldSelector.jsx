import { cn } from '../../../utils/utils';

const MergeFieldSelector = ({ isConflicted, value, onChange }) => {
  if (!isConflicted) {
    return <span className="text-xs text-muted-foreground">Giống nhau</span>;
  }

  return (
    <div className="inline-flex rounded-lg border border-border/70 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange?.('local')}
        className={cn(
          'px-2.5 py-1.5 text-xs transition-colors border-r border-border/60',
          value === 'local'
            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
            : 'bg-background hover:bg-muted/50'
        )}
      >
        Trainer
      </button>
      <button
        type="button"
        onClick={() => onChange?.('server')}
        className={cn(
          'px-2.5 py-1.5 text-xs transition-colors',
          value === 'server'
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : 'bg-background hover:bg-muted/50'
        )}
      >
        Hệ thống
      </button>
    </div>
  );
};

export default MergeFieldSelector;
