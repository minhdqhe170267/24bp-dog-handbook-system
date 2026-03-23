import PageHeader from './PageHeader';
import { Button } from '../ui/FormComponents';
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
  cancelLabel = 'Quay lại danh sách',
  extraActions = [],
  children,
  actionHint = 'Điền đầy đủ thông tin bắt buộc trước khi lưu.',
}) => {
  const SubmitIcon = resolveActionIcon(saveLabel);
  const CancelIcon = String(cancelLabel || '').toLowerCase().includes('quay lại') ? ArrowLeft : null;

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-6">
          <form id={formId} onSubmit={onSubmit}>{children}</form>
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
                  onClick={action.onClick}
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
            <Button type="submit" form={formId} loading={saving} className="w-full">
              {SubmitIcon && <SubmitIcon className="h-4 w-4" />}
              <span>{saveLabel}</span>
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="w-full">
              {CancelIcon && <CancelIcon className="h-4 w-4" />}
              {cancelLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFormPage;
