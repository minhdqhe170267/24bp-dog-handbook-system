import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, Eye } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import FilterSelect from '../../components/shared/FilterSelect';
import { Button, FormField, FormInput, Modal } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { documentExportService } from '../../services/documentExportService';
import { userService } from '../../services/userService';
import api from '../../services/api';

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

const EXPORT_PREVIEW_CONFIG = {
  BREED: {
    endpoint: '/breeds',
    columns: [
      { key: 'breedName', label: 'Tên giống' },
      { key: 'origin', label: 'Nguồn gốc' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  DISEASE: {
    endpoint: '/diseases',
    columns: [
      { key: 'diseaseName', label: 'Tên bệnh' },
      { key: 'severityLevel', label: 'Mức độ' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  MEDICATION: {
    endpoint: '/medications',
    columns: [
      { key: 'medicationName', label: 'Tên thuốc' },
      { key: 'administrationMethod', label: 'Phương pháp dùng' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  EXERCISE: {
    endpoint: '/exercises',
    columns: [
      { key: 'exerciseName', label: 'Tên bài tập' },
      { key: 'difficultyLevel', label: 'Độ khó' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  NUTRITION: {
    endpoint: '/nutrition-standards',
    columns: [
      { key: 'rationCode', label: 'Mã khẩu phần' },
      { key: 'rationName', label: 'Tên khẩu phần' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  DOG_PROFILE: {
    endpoint: '/dogs',
    columns: [
      { key: 'dogCode', label: 'Mã chó' },
      { key: 'dogName', label: 'Tên chó' },
      { key: 'status', label: 'Trạng thái' },
    ],
  },
  OPERATION_REPORT: {
    endpoint: null,
    columns: [],
  },
};

const STATUS_LABEL_MAP = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Từ chối',
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  ENROLLED: 'Đã ghi danh',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  SUSPENDED: 'Tạm dừng',
  WITHDRAWN: 'Rút khỏi chương trình',
};

const REPORT_SCOPE_LABELS = Object.fromEntries(REPORT_SCOPE_OPTIONS.map((option) => [option.value, option.label]));
const REPORT_TYPE_LABELS = Object.fromEntries(REPORT_TYPE_OPTIONS.map((option) => [option.value, option.label]));

const resolvePayloadData = (response) => response?.data ?? response ?? {};

const resolveRows = (payload) => {
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload)) return payload;
  return [];
};

const resolveTotal = (payload, fallbackLength) => {
  if (Number.isFinite(payload?.totalElements)) return payload.totalElements;
  if (Number.isFinite(payload?.totalItems)) return payload.totalItems;
  if (Number.isFinite(payload?.count)) return payload.count;
  return fallbackLength;
};

const formatPreviewValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string' && STATUS_LABEL_MAP[value]) return STATUS_LABEL_MAP[value];
  return String(value);
};

const ExportDataPage = () => {
  const toast = useToast();
  const [exportEntityType, setExportEntityType] = useState('BREED');
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportSearch, setExportSearch] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [dataPreviewLoading, setDataPreviewLoading] = useState(false);
  const [dataPreview, setDataPreview] = useState(null);
  const [isDataPreviewModalOpen, setIsDataPreviewModalOpen] = useState(false);
  const [reportScope, setReportScope] = useState('unit');
  const [reportTrainerId, setReportTrainerId] = useState('');
  const [trainerSearchKeyword, setTrainerSearchKeyword] = useState('');
  const [trainerOptions, setTrainerOptions] = useState([]);
  const [trainerOptionsLoading, setTrainerOptionsLoading] = useState(false);
  const [trainerOptionsAttempted, setTrainerOptionsAttempted] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  const [isReportPreviewModalOpen, setIsReportPreviewModalOpen] = useState(false);

  const canExportData = Boolean(exportEntityType && !exportLoading);
  const canExportReport = Boolean(
    !reportLoading && (reportScope !== 'trainer' || String(reportTrainerId || '').trim() !== '')
  );
  const normalizedExportSearch = exportSearch.trim();
  const reportSignature = useMemo(
    () =>
      JSON.stringify({
        reportScope,
        reportTrainerId: String(reportTrainerId || '').trim(),
        reportFrom,
        reportTo,
        reportType,
      }),
    [reportScope, reportTrainerId, reportFrom, reportTo, reportType]
  );
  const isDataPreviewStale =
    !dataPreview ||
    dataPreview.entityType !== exportEntityType ||
    dataPreview.format !== exportFormat ||
    dataPreview.search !== normalizedExportSearch;
  const isReportPreviewStale = !reportPreview || reportPreview.signature !== reportSignature;
  const selectedTrainerOption = useMemo(
    () => trainerOptions.find((option) => String(option.value) === String(reportTrainerId || '')),
    [trainerOptions, reportTrainerId]
  );
  const trainerFilterOptions = useMemo(() => {
    const keyword = String(trainerSearchKeyword || '').trim().toLowerCase();
    if (!keyword) return trainerOptions;
    return trainerOptions.filter((option) => option.searchToken.includes(keyword));
  }, [trainerOptions, trainerSearchKeyword]);

  useEffect(() => {
    if (reportScope !== 'trainer' || trainerOptionsLoading || trainerOptionsAttempted) return;

    let active = true;
    const loadTrainers = async () => {
      setTrainerOptionsAttempted(true);
      setTrainerOptionsLoading(true);
      try {
        const rows = await userService.getAllByRole('TRAINER');
        if (!active) return;
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((trainer) => {
            const trainerId = trainer?.userId ?? trainer?.id;
            if (!Number.isFinite(Number(trainerId)) || Number(trainerId) <= 0) return null;
            const username = String(trainer?.username || '').trim();
            const fullName = String(trainer?.fullName || '').trim();
            const display = [username, fullName].filter(Boolean).join(' - ') || 'Huấn luyện viên';

            return {
              value: String(trainerId),
              label: display,
              searchToken: `${username} ${fullName} ${trainerId}`.trim().toLowerCase(),
            };
          })
          .filter(Boolean);
        const deduped = Array.from(new Map(mapped.map((item) => [item.value, item])).values());
        setTrainerOptions(deduped);
      } catch (error) {
        if (!active) return;
        toast.error(error, { title: 'Không tải được danh sách huấn luyện viên' });
        setTrainerOptions([]);
      } finally {
        if (active) setTrainerOptionsLoading(false);
      }
    };

    loadTrainers();
    return () => {
      active = false;
    };
  }, [reportScope, trainerOptionsLoading, trainerOptionsAttempted]);

  const buildReportParams = () => ({
    from: reportFrom || undefined,
    to: reportTo || undefined,
    reportType: reportType || undefined,
  });

  const fetchDataPreview = async () => {
    const config = EXPORT_PREVIEW_CONFIG[exportEntityType];
    if (!config) {
      throw new Error('Loại dữ liệu export chưa được hỗ trợ xem trước');
    }

    if (!config.endpoint) {
      return {
        unsupported: true,
        totalRows: null,
        rows: [],
        columns: [],
      };
    }

    const params = new URLSearchParams();
    params.append('page', '0');
    params.append('size', '5');
    params.append('sort', 'updatedAt,desc');
    params.append('sort', 'createdAt,desc');
    if (normalizedExportSearch) params.append('search', normalizedExportSearch);

    const response = await api.get(`${config.endpoint}?${params.toString()}`);
    const payload = resolvePayloadData(response);
    const rows = resolveRows(payload);

    return {
      unsupported: false,
      totalRows: resolveTotal(payload, rows.length),
      rows,
      columns: config.columns,
    };
  };

  const handlePreviewData = async () => {
    if (!exportEntityType) {
      toast.error('Vui lòng chọn loại dữ liệu để xem trước');
      return;
    }

    setDataPreviewLoading(true);
    try {
      const previewResult = await fetchDataPreview();
      setDataPreview({
        ...previewResult,
        entityType: exportEntityType,
        format: exportFormat,
        search: normalizedExportSearch,
      });
      setIsDataPreviewModalOpen(true);

      if (previewResult.unsupported) {
        toast.warning('Loại dữ liệu này chưa có preview chi tiết, nhưng vẫn có thể export file.');
      } else if ((previewResult.rows || []).length > 0) {
        toast.success('Đã tải dữ liệu xem trước. Bạn có thể export.');
      } else {
        toast.warning('Không có dữ liệu phù hợp điều kiện lọc hiện tại.');
      }
    } catch (error) {
      toast.error(error, { title: 'Không thể tải xem trước export' });
      setDataPreview(null);
      setIsDataPreviewModalOpen(false);
    } finally {
      setDataPreviewLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!exportEntityType) {
      toast.error('Vui lòng chọn loại dữ liệu để export');
      return;
    }
    setExportLoading(true);
    try {
      if (exportFormat === 'pdf') {
        await documentExportService.exportPdf(exportEntityType, normalizedExportSearch || undefined);
      } else {
        await documentExportService.exportExcel(exportEntityType, normalizedExportSearch || undefined);
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
      toast.error('Vui lòng chọn huấn luyện viên để xuất báo cáo theo trainer');
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

  const handlePreviewReport = async () => {
    if (reportScope === 'trainer' && !String(reportTrainerId || '').trim()) {
      toast.error('Vui lòng chọn huấn luyện viên để xem trước báo cáo theo trainer');
      return;
    }

    setReportPreviewLoading(true);
    try {
      setReportPreview({
        signature: reportSignature,
        scopeLabel: REPORT_SCOPE_LABELS[reportScope] || '—',
        trainerId: String(reportTrainerId || '').trim(),
        trainerLabel: selectedTrainerOption?.label || null,
        from: reportFrom || null,
        to: reportTo || null,
        typeLabel: REPORT_TYPE_LABELS[reportType] || REPORT_TYPE_LABELS[''],
      });
      setIsReportPreviewModalOpen(true);
      toast.success('Đã chuẩn bị xem trước báo cáo. Bạn có thể export PDF.');
    } finally {
      setReportPreviewLoading(false);
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
                onChange={(value) => {
                  setExportEntityType(value);
                  setDataPreview(null);
                  setIsDataPreviewModalOpen(false);
                }}
                options={EXPORT_ENTITY_OPTIONS}
              />
            </FormField>

            <FormField label="Định dạng file">
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={exportFormat}
                onChange={(value) => {
                  setExportFormat(value);
                  setDataPreview(null);
                  setIsDataPreviewModalOpen(false);
                }}
                options={EXPORT_FORMAT_OPTIONS}
              />
            </FormField>

            <FormField label="Từ khóa tìm kiếm (tùy chọn)">
              <FormInput
                value={exportSearch}
                onChange={(event) => {
                  setExportSearch(event.target.value);
                  setDataPreview(null);
                  setIsDataPreviewModalOpen(false);
                }}
                placeholder="Nhập từ khóa lọc dữ liệu trước khi export"
              />
            </FormField>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePreviewData}
                loading={dataPreviewLoading}
                disabled={!exportEntityType || dataPreviewLoading}
              >
                <Eye className="h-4 w-4" />
                Xem trước
              </Button>
              <Button onClick={handleExportData} loading={exportLoading} disabled={!canExportData}>
                {exportFormat === 'pdf' ? 'Xuất PDF' : 'Xuất Excel'}
              </Button>
            </div>

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
                onChange={(value) => {
                  setReportScope(value);
                  setReportPreview(null);
                  setIsReportPreviewModalOpen(false);
                  setTrainerSearchKeyword('');
                  if (value !== 'trainer') {
                    setReportTrainerId('');
                  }
                }}
                options={REPORT_SCOPE_OPTIONS}
              />
            </FormField>

            {reportScope === 'trainer' && (
              <FormField label="Huấn luyện viên" required>
                <div className="space-y-2">
                  <FormInput
                    value={trainerSearchKeyword}
                    onChange={(event) => setTrainerSearchKeyword(event.target.value)}
                    placeholder="Tìm theo tài khoản hoặc họ tên huấn luyện viên"
                  />
                  <FilterSelect
                    className="w-full"
                    buttonClassName="w-full h-10 bg-card"
                    menuClassName="w-full max-h-72 overflow-y-auto"
                    value={String(reportTrainerId || '')}
                    onChange={(value) => {
                      setReportTrainerId(String(value || ''));
                      setReportPreview(null);
                      setIsReportPreviewModalOpen(false);
                    }}
                    options={trainerFilterOptions}
                    placeholder={trainerOptionsLoading ? 'Đang tải danh sách huấn luyện viên...' : 'Chọn huấn luyện viên'}
                  />
                  {!trainerOptionsLoading && trainerFilterOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Không tìm thấy huấn luyện viên phù hợp với từ khóa hiện tại.
                    </p>
                  ) : null}
                </div>
              </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Từ ngày">
                <FormInput
                  type="date"
                  value={reportFrom}
                  onChange={(event) => {
                    setReportFrom(event.target.value);
                    setReportPreview(null);
                    setIsReportPreviewModalOpen(false);
                  }}
                />
              </FormField>
              <FormField label="Đến ngày">
                <FormInput
                  type="date"
                  value={reportTo}
                  onChange={(event) => {
                    setReportTo(event.target.value);
                    setReportPreview(null);
                    setIsReportPreviewModalOpen(false);
                  }}
                />
              </FormField>
            </div>

            <FormField label="Loại báo cáo">
              <FilterSelect
                className="w-full"
                buttonClassName="w-full h-10 bg-card"
                menuClassName="w-full max-h-64 overflow-y-auto"
                value={reportType}
                onChange={(value) => {
                  setReportType(value);
                  setReportPreview(null);
                  setIsReportPreviewModalOpen(false);
                }}
                options={REPORT_TYPE_OPTIONS}
              />
            </FormField>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePreviewReport}
                loading={reportPreviewLoading}
                disabled={!canExportReport || reportPreviewLoading}
              >
                <Eye className="h-4 w-4" />
                Xem trước báo cáo
              </Button>
              <Button onClick={handleExportReport} loading={reportLoading} disabled={!canExportReport}>
                Xuất báo cáo PDF
              </Button>
            </div>

          </div>
        </div>
      </div>

      <Modal
        open={isDataPreviewModalOpen && Boolean(dataPreview)}
        onClose={() => setIsDataPreviewModalOpen(false)}
        title="Xem trước export dữ liệu"
        width={980}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDataPreviewModalOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handleExportData} loading={exportLoading} disabled={!canExportData}>
              {exportFormat === 'pdf' ? 'Xuất PDF' : 'Xuất Excel'}
            </Button>
          </>
        }
      >
        {dataPreview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">
                Loại: {EXPORT_ENTITY_OPTIONS.find((item) => item.value === exportEntityType)?.label || exportEntityType}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                Định dạng: {EXPORT_FORMAT_OPTIONS.find((item) => item.value === exportFormat)?.label || exportFormat}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                Tổng dữ liệu: {Number.isFinite(dataPreview.totalRows) ? dataPreview.totalRows : '—'}
              </span>
            </div>

            {dataPreview.unsupported ? (
              <p className="text-sm text-muted-foreground">
                Loại dữ liệu này chưa có preview chi tiết. Bạn vẫn có thể export với điều kiện hiện tại.
              </p>
            ) : dataPreview.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có dữ liệu mẫu để hiển thị.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      {dataPreview.columns.map((column) => (
                        <th
                          key={column.key}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreview.rows.map((row, rowIndex) => (
                      <tr
                        key={`${rowIndex}-${row?.id || row?.dogId || row?.breedId || row?.diseaseId || row?.medicationId || row?.exerciseId || row?.rationId || 'row'}`}
                        className="border-t border-border/40"
                      >
                        {dataPreview.columns.map((column) => (
                          <td key={`${rowIndex}-${column.key}`} className="px-3 py-2 text-foreground">
                            {formatPreviewValue(row?.[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={isReportPreviewModalOpen && Boolean(reportPreview)}
        onClose={() => setIsReportPreviewModalOpen(false)}
        title="Xem trước export báo cáo"
        width={720}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsReportPreviewModalOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handleExportReport} loading={reportLoading} disabled={!canExportReport}>
              Xuất báo cáo PDF
            </Button>
          </>
        }
      >
        {reportPreview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border border-border/60 bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Phạm vi</p>
              <p className="font-medium text-foreground">{reportPreview.scopeLabel}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Loại báo cáo</p>
              <p className="font-medium text-foreground">{reportPreview.typeLabel}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Từ ngày</p>
              <p className="font-medium text-foreground">{reportPreview.from || 'Không giới hạn'}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">Đến ngày</p>
              <p className="font-medium text-foreground">{reportPreview.to || 'Không giới hạn'}</p>
            </div>
            {reportScope === 'trainer' ? (
              <div className="rounded-md border border-border/60 bg-card px-3 py-2 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Huấn luyện viên</p>
                <p className="font-medium text-foreground">
                  {reportPreview.trainerLabel || '—'}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ExportDataPage;
