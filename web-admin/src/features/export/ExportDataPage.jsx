import { useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import FilterSelect from '../../components/shared/FilterSelect';
import { Button, FormField, FormInput } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { documentExportService } from '../../services/documentExportService';

const EXPORT_ENTITY_OPTIONS = [
  { value: 'BREED', label: 'Giống chó (BREED)' },
  { value: 'DISEASE', label: 'Bệnh (DISEASE)' },
  { value: 'MEDICATION', label: 'Thuốc (MEDICATION)' },
  { value: 'EXERCISE', label: 'Bài tập (EXERCISE)' },
  { value: 'NUTRITION', label: 'Dinh dưỡng (NUTRITION)' },
  { value: 'DOG_PROFILE', label: 'Hồ sơ chó (DOG_PROFILE)' },
  { value: 'OPERATION_REPORT', label: 'Báo cáo hoạt động (OPERATION_REPORT)' },
];

const EXPORT_FORMAT_OPTIONS = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
];

const REPORT_SCOPE_OPTIONS = [
  { value: 'unit', label: 'Báo cáo toàn đơn vị' },
  { value: 'trainer', label: 'Báo cáo theo trainer' },
];

const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại báo cáo' },
  { value: 'TRAINING', label: 'Huấn luyện (TRAINING)' },
  { value: 'HEALTH', label: 'Sức khỏe (HEALTH)' },
];

const ExportDataPage = () => {
  const toast = useToast();
  const [exportEntityType, setExportEntityType] = useState('BREED');
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportSearch, setExportSearch] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [reportScope, setReportScope] = useState('unit');
  const [reportTrainerId, setReportTrainerId] = useState('');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const canExportData = Boolean(exportEntityType && !exportLoading);
  const canExportReport = Boolean(
    !reportLoading && (reportScope !== 'trainer' || String(reportTrainerId || '').trim() !== '')
  );

  const buildReportParams = () => ({
    from: reportFrom || undefined,
    to: reportTo || undefined,
    reportType: reportType || undefined,
  });

  const handleExportData = async () => {
    if (!exportEntityType) {
      toast.error('Vui lòng chọn loại dữ liệu để export');
      return;
    }

    setExportLoading(true);
    try {
      const normalizedSearch = exportSearch.trim();
      if (exportFormat === 'pdf') {
        await documentExportService.exportPdf(exportEntityType, normalizedSearch || undefined);
      } else {
        await documentExportService.exportExcel(exportEntityType, normalizedSearch || undefined);
      }
      toast.success('Xuất dữ liệu thành công');
    } catch (error) {
      toast.error(error, { title: 'Không thể export dữ liệu' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (reportScope === 'trainer' && !String(reportTrainerId || '').trim()) {
      toast.error('Vui lòng nhập Trainer ID để xuất báo cáo theo trainer');
      return;
    }

    setReportLoading(true);
    try {
      const params = buildReportParams();
      if (reportScope === 'trainer') {
        await documentExportService.exportTrainerReport(String(reportTrainerId).trim(), params);
      } else {
        await documentExportService.exportUnitReport(params);
      }
      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      toast.error(error, { title: 'Không thể export báo cáo' });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Export dữ liệu"
        description="Xuất dữ liệu theo từng loại và xuất báo cáo tổng hợp"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export dữ liệu' },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">Export danh sách dữ liệu</p>
          </div>

          <div className="space-y-4">
            <FormField label="Loại dữ liệu export" required>
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={exportEntityType}
                onChange={setExportEntityType}
                options={EXPORT_ENTITY_OPTIONS}
              />
            </FormField>

            <FormField label="Định dạng file">
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={exportFormat}
                onChange={setExportFormat}
                options={EXPORT_FORMAT_OPTIONS}
              />
            </FormField>

            <FormField label="Từ khóa tìm kiếm (tùy chọn)">
              <FormInput
                value={exportSearch}
                onChange={(event) => setExportSearch(event.target.value)}
                placeholder="Nhập từ khóa lọc dữ liệu trước khi export"
              />
            </FormField>

            <Button onClick={handleExportData} loading={exportLoading} disabled={!canExportData}>
              {exportFormat === 'pdf' ? 'Xuất PDF' : 'Xuất Excel'}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">Export báo cáo tổng hợp</p>
          </div>

          <div className="space-y-4">
            <FormField label="Phạm vi báo cáo">
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={reportScope}
                onChange={setReportScope}
                options={REPORT_SCOPE_OPTIONS}
              />
            </FormField>

            {reportScope === 'trainer' && (
              <FormField label="Trainer ID" required>
                <FormInput
                  type="number"
                  min="1"
                  value={reportTrainerId}
                  onChange={(event) => setReportTrainerId(event.target.value)}
                  placeholder="Ví dụ: 3"
                />
              </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Từ ngày">
                <FormInput type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
              </FormField>
              <FormField label="Đến ngày">
                <FormInput type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
              </FormField>
            </div>

            <FormField label="Loại báo cáo">
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={reportType}
                onChange={setReportType}
                options={REPORT_TYPE_OPTIONS}
              />
            </FormField>

            <Button onClick={handleExportReport} loading={reportLoading} disabled={!canExportReport}>
              Xuất báo cáo PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDataPage;
