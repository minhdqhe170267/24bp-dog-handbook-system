import { useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import PageHeader from './PageHeader';
import { Button, ConfirmDialog } from '../ui/FormComponents';
import { ArrowLeft, FileText, Globe, Send } from 'lucide-react';

const iconByKeyword = [
  { keyword: 'lưu nháp', icon: FileText },
  { keyword: 'gửi duyệt', icon: Send },
  { keyword: 'xuất bản', icon: Globe },
];

const resolveActionIcon = (label, explicitIcon) => {
  if (explicitIcon) return explicitIcon;
  const normalized = String(label || '').trim().toLowerCase();
  const matched = iconByKeyword.find((item) => normalized.includes(item.keyword));
  return matched?.icon || null;
};

const resolveActionVariant = (label, explicitVariant) => {
  if (explicitVariant) return explicitVariant;
  const normalized = String(label || '').trim().toLowerCase();
  if (normalized.includes('lưu nháp')) return 'muted';
  if (normalized.includes('xuất bản')) return 'success';
  return 'outline';
};

const CreateFormPage = ({
  title,
  description,
  breadcrumbs = [],
  formId,
  onSubmit,
  onCancel,
  saving = false,
  saveLabel = 'Tạo mới',
  showSubmitAction = true,
  cancelLabel = 'Quay lại danh sách',
  extraActions = [],
  children,
  actionHint = 'Điền đầy đủ thông tin bắt buộc trước khi lưu.',
  warnWhenUnsaved = true,
}) => {
  const SubmitIcon = resolveActionIcon(saveLabel);
  const CancelIcon = String(cancelLabel || '').toLowerCase().includes('quay lại') ? ArrowLeft : null;
  const [isDirty, setIsDirty] = useState(false);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [saveAttemptRunning, setSaveAttemptRunning] = useState(false);
  const dirtySnapshotRef = useRef(false);

  const isAnyActionLoading = useMemo(
    () => Boolean(saving || extraActions.some((action) => Boolean(action.loading))),
    [saving, extraActions]
  );

  const shouldBlockNavigation = warnWhenUnsaved && isDirty && !allowNavigation;
  const blocker = useBlocker(shouldBlockNavigation);
  const showLeaveConfirm = blocker.state === 'blocked';

  useBeforeUnload((event) => {
    if (!shouldBlockNavigation) return;
    event.preventDefault();
    event.returnValue = '';
  });

  useEffect(() => {
    if (!saveAttemptRunning) return;
    if (isAnyActionLoading) return;

    // Nếu thao tác lưu/duyệt không chuyển trang (thường là lỗi), bật lại trạng thái dirty.
    if (dirtySnapshotRef.current) {
      setIsDirty(true);
    }
    dirtySnapshotRef.current = false;
    setAllowNavigation(false);
    setSaveAttemptRunning(false);
  }, [isAnyActionLoading, saveAttemptRunning]);

  const markFormDirty = () => {
    if (!warnWhenUnsaved) return;
    setIsDirty(true);
  };

  const markSaveIntent = () => {
    if (!warnWhenUnsaved) return;
    dirtySnapshotRef.current = isDirty;
    setIsDirty(false);
    setAllowNavigation(true);
    setSaveAttemptRunning(true);
  };

  const handleSubmit = (event) => {
    markSaveIntent();
    onSubmit?.(event);
  };

  const handleActionClick = (action, event) => {
    if (!action?.onClick) return;
    markSaveIntent();
    action.onClick(event);
  };

  const handleConfirmLeave = () => {
    setAllowNavigation(true);
    blocker.proceed();
  };

  const handleStayOnPage = () => {
    setAllowNavigation(false);
    blocker.reset();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-6">
          <form
            id={formId}
            onSubmit={handleSubmit}
            onChangeCapture={markFormDirty}
            onInputCapture={markFormDirty}
          >
            {children}
          </form>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-6 h-fit">
          <h3 className="text-sm font-semibold text-foreground mb-3">Hành động</h3>
          <p className="text-xs text-muted-foreground mb-4">{actionHint}</p>
          <div className="space-y-2">
            {extraActions.map((action) => {
              const ActionIcon = resolveActionIcon(action.label, action.icon);
              return (
                <Button
                  key={action.key || action.label}
                  type={action.type || 'button'}
                  form={action.form}
                  onClick={(event) => handleActionClick(action, event)}
                  loading={Boolean(action.loading)}
                  disabled={Boolean(action.disabled)}
                  variant={resolveActionVariant(action.label, action.variant)}
                  className="w-full"
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4" />}
                  <span>{action.label}</span>
                </Button>
              );
            })}
            {showSubmitAction ? (
              <Button type="submit" form={formId} loading={saving} className="w-full">
                {SubmitIcon && <SubmitIcon className="h-4 w-4" />}
                <span>{saveLabel}</span>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onCancel} className="w-full">
              {CancelIcon && <CancelIcon className="h-4 w-4" />}
              {cancelLabel}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        onClose={handleStayOnPage}
        title="Bạn có thông tin chưa lưu"
        description="Bạn đang rời trang khi chưa lưu nháp hoặc gửi duyệt. Nếu tiếp tục, dữ liệu vừa nhập có thể bị mất."
        onConfirm={handleConfirmLeave}
        confirmLabel="Rời trang"
        variant="destructive"
      />
    </div>
  );
};

export default CreateFormPage;
