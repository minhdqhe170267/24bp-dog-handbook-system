import { useMemo } from 'react';
import FieldDiffRow from './FieldDiffRow';
import { formatValue, getAllFieldKeys, normalizeFieldKey, resolveFieldLabel } from './conflictDiffUtils';

const ConflictDiffView = ({
  localData = {},
  serverData = {},
  mergedData = null,
  conflictedFields = [],
  entityType,
  mode = 'view',
  selections = {},
  onSelectionChange,
  localLabel = 'Trainer',
  serverLabel = 'Hệ thống',
}) => {
  const normalizedConflictedFields = useMemo(
    () => new Set((conflictedFields || []).map((field) => normalizeFieldKey(field))),
    [conflictedFields]
  );

  const rows = useMemo(() => {
    const allKeys = getAllFieldKeys(localData, serverData, mergedData);
    return allKeys
      .map((fieldKey) => {
        const normalizedKey = normalizeFieldKey(fieldKey);
        return {
          fieldKey,
          fieldLabel: resolveFieldLabel(entityType, fieldKey),
          isConflicted: normalizedConflictedFields.has(normalizedKey),
          localValue: formatValue(localData?.[fieldKey], fieldKey),
          serverValue: formatValue(serverData?.[fieldKey], fieldKey),
          mergedValue: formatValue(mergedData?.[fieldKey], fieldKey),
        };
      })
      .sort((left, right) => {
        if (left.isConflicted !== right.isConflicted) return left.isConflicted ? -1 : 1;
        return left.fieldLabel.localeCompare(right.fieldLabel, 'vi');
      });
  }, [entityType, localData, mergedData, normalizedConflictedFields, serverData]);

  const showMergedColumn = Boolean(mergedData);
  const showMergeSelectorColumn = mode === 'merge' && !showMergedColumn;

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 min-w-[220px]">
              Trường
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 min-w-[260px]">
              Bản {localLabel}
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 min-w-[260px]">
              Bản {serverLabel}
            </th>
            {showMergedColumn ? (
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 min-w-[260px]">
                Bản đã merge
              </th>
            ) : null}
            {showMergeSelectorColumn ? (
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/80 min-w-[160px]">
                Chọn giữ
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <FieldDiffRow
              key={row.fieldKey}
              fieldKey={row.fieldKey}
              fieldLabel={row.fieldLabel}
              localValue={row.localValue}
              serverValue={row.serverValue}
              mergedValue={row.mergedValue}
              isConflicted={row.isConflicted}
              mode={mode}
              selection={selections?.[row.fieldKey] || selections?.[normalizeFieldKey(row.fieldKey)] || null}
              onSelectionChange={(fieldKey, choice) => onSelectionChange?.(fieldKey, choice)}
              showMergedColumn={showMergedColumn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConflictDiffView;
