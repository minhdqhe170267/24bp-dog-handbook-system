import { cn } from '../../../utils/utils';
import MergeFieldSelector from './MergeFieldSelector';

const renderCellClass = (isConflicted, source) => {
  if (!isConflicted) return 'text-muted-foreground';
  if (source === 'local') return 'border-l-2 border-l-sky-500/80';
  if (source === 'server') return 'border-l-2 border-l-emerald-500/80';
  if (source === 'merged') return 'border-l-2 border-l-indigo-500/80';
  return '';
};

const FieldDiffRow = ({
  fieldKey,
  fieldLabel,
  localValue,
  serverValue,
  mergedValue,
  isConflicted,
  mode,
  selection,
  onSelectionChange,
  showMergedColumn,
}) => {
  const isMergeMode = mode === 'merge';
  const selectionMissing = isMergeMode && isConflicted && !selection;

  return (
    <tr
      className={cn(
        'border-t border-border/50',
        isConflicted ? 'bg-rose-500/5 dark:bg-rose-900/10' : 'bg-transparent'
      )}
    >
      <td className="px-3 py-2 align-top">
        <div className="font-medium text-foreground">{fieldLabel}</div>
      </td>

      <td className={cn('px-3 py-2 align-top', renderCellClass(isConflicted, 'local'))}>
        <span className={cn('whitespace-pre-wrap break-words text-sm', isConflicted && 'font-medium')}>{localValue}</span>
      </td>

      <td className={cn('px-3 py-2 align-top', renderCellClass(isConflicted, 'server'))}>
        <span className={cn('whitespace-pre-wrap break-words text-sm', isConflicted && 'font-medium')}>{serverValue}</span>
      </td>

      {showMergedColumn ? (
        <td className={cn('px-3 py-2 align-top', renderCellClass(isConflicted, 'merged'))}>
          <span className={cn('whitespace-pre-wrap break-words text-sm', isConflicted && 'font-medium')}>{mergedValue}</span>
        </td>
      ) : null}

      {isMergeMode && !showMergedColumn ? (
        <td className="px-3 py-2 align-top">
          <MergeFieldSelector
            isConflicted={isConflicted}
            value={selection}
            onChange={(next) => onSelectionChange?.(fieldKey, next)}
          />
          {selectionMissing ? (
            <p className="text-[11px] text-destructive mt-1">Vui lòng chọn 1 phía</p>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
};

export default FieldDiffRow;
