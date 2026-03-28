import { useEffect, useMemo, useState } from 'react';
import {
  CircleCheck,
  Download,
  FileSpreadsheet,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { Button, FormField, FormSelect } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { documentImportService } from '../../services/documentImportService';

const FILE_ACCEPT = '.csv,.xls,.xlsx';

const ImportDataPage = () => {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.entityType === entityType) || null,
    [templates, entityType]
  );

  const columnLabelMap = useMemo(() => {
    if (!selectedTemplate?.columns?.length) return {};
    return Object.fromEntries(
      selectedTemplate.columns
        .map((column) => [
          String(column.fieldName || column.name || '').trim(),
          column.label || column.name || column.fieldName || '',
        ])
        .filter(([fieldName, label]) => fieldName && label)
    );
  }, [selectedTemplate]);

  const canPreview = Boolean(entityType && file && !previewLoading);
  const canConfirm = Boolean(
    entityType &&
    file &&
    preview &&
    preview.canConfirm &&
    !confirmLoading
  );

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await documentImportService.getTemplates();
        const templateData = res?.data || res || [];
        const normalized = Array.isArray(templateData) ? templateData : [];
        setTemplates(normalized);
        if (normalized.length > 0) {
          setEntityType((current) => current || normalized[0].entityType);
        }
      } catch (error) {
        console.error('Fetch import templates error:', error);
        toast.error(error, { title: 'Không tải được danh sách mẫu nhập' });
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [toast]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!entityType || !file) {
      toast.error('Vui lòng chọn loại dữ liệu và tệp cần nhập');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await documentImportService.preview(entityType, file);
      const payload = res?.data || res || null;
      setPreview(payload);

      if (payload?.canConfirm) {
        toast.success('Xem trước thành công. Bạn có thể xác nhận nhập dữ liệu.');
      } else {
        toast.warning(`Xem trước có ${Number(payload?.errorRows || 0)} dòng lỗi.`);
      }
    } catch (error) {
      console.error('Preview import error:', error);
      toast.error(error, { title: 'Không thể xem trước tệp nhập' });
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!entityType || !file || !preview?.canConfirm) {
      toast.error('Kết quả xem trước chưa hợp lệ để xác nhận nhập');
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await documentImportService.confirm(entityType, file);
      const payload = res?.data || res || null;
      setPreview(payload);
      toast.success('Nhập dữ liệu thành công');
    } catch (error) {
      console.error('Confirm import error:', error);
      toast.error(error, { title: 'Không thể xác nhận nhập dữ liệu' });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!entityType) {
      toast.error('Vui lòng chọn loại dữ liệu trước khi tải mẫu nhập');
      return;
    }

    setDownloadLoading(true);
    try {
      await documentImportService.downloadTemplate(entityType);
      toast.success('Đã tải mẫu nhập thành công');
    } catch (error) {
      console.error('Download template error:', error);
      toast.error(error, { title: 'Không thể tải mẫu nhập' });
    } finally {
      setDownloadLoading(false);
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    return String(value);
  };

  const resolveColumnLabel = (columnName) => columnLabelMap[columnName] || columnName;

  const entityStatusHint =
    entityType === 'DOG_PROFILE'
      ? 'Hồ sơ chó sẽ giữ trạng thái từ tệp hoặc mặc định là hoạt động (ACTIVE).'
      : 'Nội dung nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT).';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nhập dữ liệu"
        description="Tải mẫu nhập, tải tệp lên, xem trước lỗi theo dòng và nhập vào hệ thống"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Nhập dữ liệu' },
        ]}
      />

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FormField label="Loại dữ liệu nhập" required>
              <FormSelect
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value);
                  setPreview(null);
                }}
                disabled={loadingTemplates || templates.length === 0}
                options={templates.map((template) => ({
                  value: template.entityType,
                  label: `${template.templateName} (${template.entityType})`,
                }))}
              />
            </FormField>

            <FormField label="Chọn tệp nhập" required>
              <label className="flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 transition-colors hover:border-accent/50">
                <span className="truncate text-sm text-muted-foreground">
                  {file ? file.name : 'Chọn tệp .xlsx, .xls hoặc .csv'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  Tải lên
                </span>
                <input type="file" accept={FILE_ACCEPT} onChange={handleFileChange} className="hidden" />
              </label>
            </FormField>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handlePreview} disabled={!canPreview} loading={previewLoading}>
                Xem trước
              </Button>
              <Button variant="secondary" onClick={handleConfirm} disabled={!canConfirm} loading={confirmLoading}>
                Xác nhận nhập
              </Button>
              <Button
                variant="ghost"
                onClick={handleDownloadTemplate}
                disabled={!entityType || downloadLoading}
                loading={downloadLoading}
              >
                <Download className="mr-1 h-4 w-4" />
                Tải mẫu nhập
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-4">
            <div className="mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Mẫu nhập</p>
            </div>

            {selectedTemplate ? (
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>{selectedTemplate.description || 'Không có mô tả'}</p>
                <p className="rounded-md bg-muted/60 px-3 py-2 text-foreground">{entityStatusHint}</p>

                {Array.isArray(selectedTemplate.instructions) && selectedTemplate.instructions.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-foreground">Hướng dẫn</p>
                    <div className="space-y-1">
                      {selectedTemplate.instructions.map((instruction) => (
                        <p key={instruction}>{instruction}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1 font-medium text-foreground">Định dạng file</p>
                  <p>{(selectedTemplate.supportedFileTypes || []).join(', ') || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loadingTemplates ? 'Đang tải mẫu nhập...' : 'Chưa có mẫu nhập'}
              </p>
            )}
          </div>
        </div>
      </div>

      {selectedTemplate?.columns?.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Thông tin cột trong mẫu nhập</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/40">
                  {['Tên cột trong file', 'Bắt buộc', 'Kiểu dữ liệu', 'Giá trị hợp lệ', 'Mô tả', 'Ví dụ'].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedTemplate.columns.map((column) => (
                  <tr key={column.fieldName || column.name} className="border-t border-border/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-foreground">
                      {column.label || column.name || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{column.required ? 'Có' : 'Không'}</td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{column.dataType || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {(column.allowedValues || []).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{column.description || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{column.example || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Tổng số dòng</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{preview.totalRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Dòng hợp lệ</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-300">
                {preview.validRows ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Dòng lỗi</p>
              <p className="mt-1 text-xl font-semibold text-destructive">{preview.errorRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Trạng thái</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {preview.canConfirm ? 'Sẵn sàng xác nhận' : 'Cần xử lý lỗi trước khi xác nhận'}
              </p>
            </div>
          </div>

          {Array.isArray(preview.warnings) && preview.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Lưu ý</p>
              <div className="mt-2 space-y-1 text-sm text-amber-700/90 dark:text-amber-200">
                {preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(preview.rowErrors) && preview.rowErrors.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 border-b border-destructive/20 px-4 py-3">
                <TriangleAlert className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Chi tiết lỗi nhập dữ liệu</p>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-destructive/10">
                      {['Dòng', 'Cột', 'Mã lỗi', 'Thông báo'].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-destructive"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rowErrors.map((error, index) => (
                      <tr key={`${error.rowNumber}-${error.column}-${index}`} className="border-t border-destructive/10">
                        <td className="px-4 py-2.5 text-sm text-foreground">{error.rowNumber ?? '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{resolveColumnLabel(error.column) || '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{error.code || '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{error.message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(preview.previewData) && preview.previewData.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Dữ liệu xem trước</p>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CircleCheck className="h-3.5 w-3.5" />
                  Tối đa 10 dòng
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/40">
                      {(preview.columns || []).map((column) => (
                        <th
                          key={column}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {resolveColumnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewData.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${preview.fileName || 'preview'}`} className="border-t border-border/40">
                        {(preview.columns || []).map((column) => (
                          <td key={`${rowIndex}-${column}`} className="whitespace-nowrap px-4 py-2.5 text-sm text-foreground">
                            {formatCellValue(row?.[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportDataPage;
