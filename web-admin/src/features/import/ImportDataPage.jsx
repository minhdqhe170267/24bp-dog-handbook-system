import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Upload, TriangleAlert, CircleCheck } from 'lucide-react';
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.entityType === entityType) || null,
    [templates, entityType]
  );

  const canPreview = Boolean(entityType && file && !previewLoading);
  const canConfirm = Boolean(entityType && file && preview && !confirmLoading && Number(preview.errorRows || 0) === 0);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await documentImportService.getTemplates();
      const templateData = res?.data || res || [];
      setTemplates(Array.isArray(templateData) ? templateData : []);
      if (Array.isArray(templateData) && templateData.length > 0) {
        setEntityType(templateData[0].entityType);
      }
    } catch (error) {
      console.error('Fetch import templates error:', error);
      toast.error(error?.message || 'Không tải được danh sách template import');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!entityType || !file) {
      toast.error('Vui lòng chọn loại dữ liệu và file import');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await documentImportService.preview(entityType, file);
      const payload = res?.data || res || null;
      setPreview(payload);
      const errorCount = Number(payload?.errorRows || 0);
      if (errorCount > 0) {
        toast.warning(`Preview có ${errorCount} dòng lỗi, cần sửa trước khi import`);
      } else {
        toast.success('Preview thành công, bạn có thể xác nhận import');
      }
    } catch (error) {
      console.error('Preview import error:', error);
      toast.error(error?.message || 'Không thể preview file import');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!entityType || !file) {
      toast.error('Vui lòng chọn file import');
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await documentImportService.confirm(entityType, file);
      const payload = res?.data || res || null;
      setPreview(payload);
      const failedRows = Number(payload?.errorRows || 0);
      if (failedRows > 0) {
        toast.warning(`Import hoàn tất nhưng có ${failedRows} dòng lỗi`);
      } else {
        toast.success('Import dữ liệu thành công');
      }
    } catch (error) {
      console.error('Confirm import error:', error);
      toast.error(error?.message || 'Không thể xác nhận import dữ liệu');
    } finally {
      setConfirmLoading(false);
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Đúng' : 'Sai';
    return String(value);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Import dữ liệu"
        description="Upload file Excel/CSV, kiểm tra preview và xác nhận nhập dữ liệu"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quản lý nội dung' },
          { label: 'Import dữ liệu' },
        ]}
      />

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FormField label="Loại dữ liệu import" required>
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

            <FormField label="Chọn file import" required>
              <label className="flex items-center justify-between gap-3 w-full h-12 px-3 border border-input rounded-lg bg-background cursor-pointer hover:border-accent/50 transition-colors">
                <span className="text-sm text-muted-foreground truncate">
                  {file ? file.name : 'Chọn file .xlsx, .xls hoặc .csv'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  Tải lên
                </span>
                <input type="file" accept={FILE_ACCEPT} onChange={handleFileChange} className="hidden" />
              </label>
            </FormField>

            <div className="flex items-center gap-2">
              <Button onClick={handlePreview} disabled={!canPreview} loading={previewLoading}>
                Xem trước
              </Button>
              <Button variant="secondary" onClick={handleConfirm} disabled={!canConfirm} loading={confirmLoading}>
                Xác nhận import
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Template</p>
            </div>
            {selectedTemplate ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>{selectedTemplate.description || 'Không có mô tả'}</p>
                <div>
                  <p className="text-foreground font-medium mb-1">Cột bắt buộc</p>
                  <p>{(selectedTemplate.requiredColumns || []).join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-foreground font-medium mb-1">Cột tùy chọn</p>
                  <p>{(selectedTemplate.optionalColumns || []).join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-foreground font-medium mb-1">Định dạng file</p>
                  <p>{(selectedTemplate.supportedFileTypes || []).join(', ') || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loadingTemplates ? 'Đang tải template...' : 'Chưa có template import'}
              </p>
            )}
          </div>
        </div>
      </div>

      {preview && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Tổng số dòng</p>
              <p className="text-xl font-semibold text-foreground mt-1">{preview.totalRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Dòng hợp lệ</p>
              <p className="text-xl font-semibold text-emerald-600 mt-1">{preview.validRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">Dòng lỗi</p>
              <p className="text-xl font-semibold text-destructive mt-1">{preview.errorRows ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs text-muted-foreground">File</p>
              <p className="text-sm font-medium text-foreground mt-1 truncate">{preview.fileName || '—'}</p>
            </div>
          </div>

          {Array.isArray(preview.errors) && preview.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Danh sách lỗi import</p>
              </div>
              <ul className="list-disc list-inside text-sm text-destructive/90 space-y-1 max-h-52 overflow-y-auto">
                {preview.errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(preview.previewData) && preview.previewData.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
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
                          className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 whitespace-nowrap"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-border/40">
                        {(preview.columns || []).map((column) => (
                          <td key={`${rowIndex}-${column}`} className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
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

