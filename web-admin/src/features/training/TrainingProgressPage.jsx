import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Search } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  Button,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  Modal,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import trainingProgressService from '../../services/trainingProgressService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const enrollmentStatusOptions = [
  { value: 'ENROLLED', label: 'Đã khởi tạo' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
  { value: 'WITHDRAWN', label: 'Ngừng theo học' },
];

const exerciseStatusOptions = [
  { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'SKIPPED', label: 'Bỏ qua' },
];

const listStatusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...enrollmentStatusOptions,
];

const defaultUpdateForm = {
  status: '',
  notes: '',
};

const defaultExerciseForm = {
  status: '',
  score: '',
  trainerNotes: '',
};

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const twoDigits = (num) => String(num).padStart(2, '0');
  return {
    time: `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`,
    date: `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const renderDateTimeCell = (value) => {
  const parts = getDateTimeParts(value);
  if (!parts) return '—';
  return (
    <div className="leading-tight">
      <div className="text-sm font-medium text-foreground">{parts.time}</div>
      <div className="text-xs text-muted-foreground">{parts.date}</div>
    </div>
  );
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return '0%';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${value}%`;
  return `${numeric.toFixed(0)}%`;
};

const formatScore = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toFixed(1);
};

const SpecialtyInfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-border/60 bg-card p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-sm font-medium text-foreground">{value || '—'}</div>
  </div>
);

const TrainingProgressPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isTrainer = String(user?.role || '').toUpperCase() === 'TRAINER';

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [dogFilter, setDogFilter] = useState('');

  const [dogs, setDogs] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState(defaultUpdateForm);
  const [exerciseForm, setExerciseForm] = useState(defaultExerciseForm);
  const [exerciseTarget, setExerciseTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadLookups = async () => {
    if (isTrainer) return;
    setLookupLoading(true);
    try {
      const [dogRows, trainerRows] = await Promise.all([
        fetchAllPages((pageIndex, batchSize) => dogService.getAll(pageIndex, batchSize, '')),
        userService.getAllByRole('TRAINER'),
      ]);
      setDogs(Array.isArray(dogRows) ? dogRows : []);
      setTrainers(Array.isArray(trainerRows) ? trainerRows : []);
    } catch (error) {
      toast.error(error, { title: 'Không tải được dữ liệu bộ lọc tiến độ' });
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, [isTrainer]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchList = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      let summaries = [];
      if (isTrainer) {
        const response = await trainingProgressService.getMine();
        summaries = response?.data ?? response ?? [];
      } else if (dogFilter) {
        const response = await trainingProgressService.getByDog(Number(dogFilter));
        summaries = response?.data ?? response ?? [];
      } else if (trainerFilter) {
        const response = await trainingProgressService.getByTrainer(Number(trainerFilter));
        summaries = response?.data ?? response ?? [];
      } else if (trainers.length > 0) {
        const responses = await Promise.all(
          trainers.map((trainer) =>
            trainingProgressService.getByTrainer(trainer.userId).catch(() => ({ data: [] }))
          )
        );
        summaries = responses.flatMap((response) => response?.data ?? response ?? []);
      }

      const keyword = search.trim().toLowerCase();
      const filteredRows = summaries.filter((item) => {
        const matchesSearch =
          !keyword ||
          String(item?.dogName || '').toLowerCase().includes(keyword) ||
          String(item?.trainerName || '').toLowerCase().includes(keyword) ||
          String(item?.specialtyName || '').toLowerCase().includes(keyword) ||
          String(item?.currentRoadmapName || '').toLowerCase().includes(keyword);
        const matchesStatus = statusFilter === 'all' || item?.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const dedupedRows = Array.from(
        new Map(filteredRows.map((item) => [item.enrollmentId, item])).values()
      );
      const sortedRows = dedupedRows.sort((left, right) => {
        const leftTime = new Date(left?.enrolledAt || 0).getTime();
        const rightTime = new Date(right?.enrolledAt || 0).getTime();
        return rightTime - leftTime;
      });
      const { pageRows, totalItems: nextTotalItems, effectivePage } = paginateRows(
        sortedRows,
        nextPage,
        nextPageSize
      );

      setRows(pageRows);
      setTotalItems(nextTotalItems);
      if (effectivePage !== nextPage) {
        setPage(effectivePage);
      }
    } catch (error) {
      toast.error(error, { title: 'Không tải được tiến độ huấn luyện' });
      setRows([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTrainer && lookupLoading) return;
    fetchList(page, pageSize);
  }, [isTrainer, lookupLoading, page, pageSize, search, statusFilter, trainerFilter, dogFilter, trainers]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const response = await trainingProgressService.getById(id);
      const detail = response?.data ?? response ?? null;
      setSelectedId(id);
      setSelectedDetail(detail);
    } catch (error) {
      toast.error(error, { title: 'Không tải được chi tiết tiến độ' });
    } finally {
      setDetailLoading(false);
    }
  };

  const openUpdateModal = () => {
    const summary = selectedDetail?.summary;
    if (!summary) return;
    setUpdateForm({
      status: summary.status || '',
      notes: summary.notes || '',
    });
    setUpdateModalOpen(true);
  };

  const openExerciseModal = (exercise) => {
    setExerciseTarget(exercise);
    setExerciseForm({
      status: exercise.status || '',
      score: exercise.score ?? '',
      trainerNotes: exercise.trainerNotes || '',
    });
    setExerciseModalOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await trainingProgressService.update(selectedId, {
        status: updateForm.status || null,
        notes: updateForm.notes?.trim() || null,
      });
      toast.success('Cập nhật trạng thái tiến độ thành công');
      setUpdateModalOpen(false);
      await Promise.all([fetchList(page, pageSize), fetchDetail(selectedId)]);
    } catch (error) {
      toast.error(error, { title: 'Không thể cập nhật tiến độ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluateExercise = async () => {
    if (!exerciseTarget?.progressId) return;
    setSubmitting(true);
    try {
      await trainingProgressService.evaluateExercise(exerciseTarget.progressId, {
        status: exerciseForm.status,
        score: exerciseForm.score === '' ? null : Number(exerciseForm.score),
        trainerNotes: exerciseForm.trainerNotes?.trim() || null,
      });
      toast.success('Đánh giá bài tập thành công');
      setExerciseModalOpen(false);
      if (selectedId) {
        await Promise.all([fetchList(page, pageSize), fetchDetail(selectedId)]);
      }
    } catch (error) {
      toast.error(error, { title: 'Không thể cập nhật bài tập' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'dogName',
      header: 'Chó',
      render: (row) => <span className="font-medium">{row.dogName || '—'}</span>,
    },
    {
      key: 'trainerName',
      header: 'Huấn luyện viên',
      className: 'w-52',
      render: (row) => row.trainerName || '—',
    },
    {
      key: 'specialtyName',
      header: 'Chuyên ngành',
      className: 'w-52',
      render: (row) => row.specialtyName || '—',
    },
    {
      key: 'currentRoadmapName',
      header: 'Lộ trình hiện tại',
      className: 'w-56',
      render: (row) => row.currentRoadmapName || '—',
    },
    {
      key: 'progressPercent',
      header: 'Tiến độ',
      className: 'w-32',
      render: (row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{formatPercent(row.progressPercent)}</div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, Number(row.progressPercent) || 0))}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-40',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'enrolledAt',
      header: 'Khởi tạo',
      className: 'w-44',
      render: (row) => renderDateTimeCell(row.enrolledAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-24',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => fetchDetail(row.enrollmentId)} title="Xem tiến độ">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const detailRoadmaps = selectedDetail?.roadmaps || [];
  const summary = selectedDetail?.summary || null;

  const trainerOptions = useMemo(
    () => [
      { value: '', label: 'Theo huấn luyện viên' },
      ...trainers.map((trainer) => ({
        value: String(trainer.userId),
        label: `${trainer.fullName} (${trainer.specialtyName || 'Chưa có chuyên ngành'})`,
      })),
    ],
    [trainers]
  );

  const dogOptions = useMemo(
    () => [
      { value: '', label: 'Theo chó' },
      ...dogs.map((dog) => ({
        value: String(dog.dogId),
        label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
      })),
    ],
    [dogs]
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tiến độ huấn luyện"
        description="Theo dõi chương trình huấn luyện đã được khởi tạo tự động khi phân công chó cho trainer"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Huấn luyện' },
          { label: 'Tiến độ huấn luyện' },
        ]}
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Tìm theo chó, trainer, chuyên ngành..."
            className="h-9 w-full pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          options={listStatusOptions}
        />
        {!isTrainer ? (
          <>
            <FilterSelect
              value={trainerFilter}
              onChange={(value) => {
                setTrainerFilter(value);
                if (value) setDogFilter('');
                setPage(0);
              }}
              options={trainerOptions}
            />
            <FilterSelect
              value={dogFilter}
              onChange={(value) => {
                setDogFilter(value);
                if (value) setTrainerFilter('');
                setPage(0);
              }}
              options={dogOptions}
            />
          </>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading || lookupLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPage(0);
          setPageSize(nextSize);
        }}
        emptyMessage="Chưa có hồ sơ tiến độ nào"
      />

      {selectedId ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-foreground">Chi tiết tiến độ</div>
              <div className="text-sm text-muted-foreground">
                {summary ? `${summary.dogName || '—'} · ${summary.specialtyName || '—'}` : 'Đang tải dữ liệu'}
              </div>
            </div>
            {summary ? (
              <Button variant="outline" onClick={openUpdateModal}>
                <Pencil className="h-4 w-4" />
                Cập nhật hồ sơ học
              </Button>
            ) : null}
          </div>

          {detailLoading ? (
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
          ) : summary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SpecialtyInfoCard label="Trainer" value={summary.trainerName} />
                <SpecialtyInfoCard label="Lộ trình hiện tại" value={summary.currentRoadmapName} />
                <SpecialtyInfoCard label="Giai đoạn hiện tại" value={summary.currentPhaseName} />
                <SpecialtyInfoCard label="Version chuyên ngành" value={summary.specialtyVersion} />
              </div>

              <div className="rounded-xl border border-border/60 p-4 bg-background/40">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                  <div className="text-sm font-medium text-foreground">Tiến độ tổng thể</div>
                  <StatusBadge status={summary.status} />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-2xl font-semibold text-foreground">{formatPercent(summary.progressPercent)}</div>
                  <div className="flex-1 min-w-[220px] h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(0, Math.min(100, Number(summary.progressPercent) || 0))}%` }}
                    />
                  </div>
                </div>
                {summary.notes ? (
                  <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{summary.notes}</div>
                ) : null}
              </div>

              <div className="space-y-4">
                {detailRoadmaps.map((roadmap) => (
                  <div key={roadmap.roadmapId} className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-4 py-3 bg-muted/40 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-medium text-foreground">
                          {roadmap.roadmapOrder}. {roadmap.roadmapName}
                        </div>
                        <div className="text-sm text-muted-foreground">{roadmap.targetRole || 'Không có vai trò mục tiêu'}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-sm font-medium">{formatPercent(roadmap.progressPercent)}</div>
                        <StatusBadge status={roadmap.status} />
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {roadmap.phases?.map((phase) => (
                        <div key={`${roadmap.roadmapId}-${phase.phaseOrder}`} className="rounded-lg border border-border/50">
                          <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap bg-background">
                            <div>
                              <div className="font-medium text-foreground">
                                Giai đoạn {phase.phaseOrder}: {phase.phaseName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {phase.completedExercises}/{phase.totalExercises} bài đã hoàn thành
                              </div>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {phase.totalExercises > 0
                                ? formatPercent((phase.completedExercises / phase.totalExercises) * 100)
                                : '0%'}
                            </div>
                          </div>

                          <div className="divide-y divide-border/50">
                            {phase.exercises?.map((exercise) => (
                              <div key={exercise.progressId} className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                                <div className="space-y-1">
                                  <div className="font-medium text-foreground">{exercise.exerciseName}</div>
                                  <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                                    <StatusBadge status={exercise.status} />
                                    <span>Điểm: {formatScore(exercise.score)}</span>
                                    <span>
                                      Hoàn tất:{' '}
                                      {exercise.completedAt
                                        ? `${getDateTimeParts(exercise.completedAt)?.time || ''} ${
                                            getDateTimeParts(exercise.completedAt)?.date || ''
                                          }`.trim()
                                        : '—'}
                                    </span>
                                  </div>
                                  {exercise.trainerNotes ? (
                                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {exercise.trainerNotes}
                                    </div>
                                  ) : null}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => openExerciseModal(exercise)}>
                                  Cập nhật bài tập
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Cập nhật hồ sơ tiến độ"
        width={620}
        footer={
          <>
            <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateProgress} loading={submitting}>
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Trạng thái">
            <FormSelect
              value={updateForm.status}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, status: event.target.value }))}
              options={enrollmentStatusOptions}
              placeholder="Chọn trạng thái"
            />
          </FormField>
          <FormField label="Ghi chú">
            <FormTextarea
              rows={5}
              maxLength={255}
              value={updateForm.notes}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={exerciseModalOpen}
        onClose={() => setExerciseModalOpen(false)}
        title={exerciseTarget ? `Cập nhật: ${exerciseTarget.exerciseName}` : 'Cập nhật bài tập'}
        width={620}
        footer={
          <>
            <Button variant="outline" onClick={() => setExerciseModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleEvaluateExercise} loading={submitting}>
              Lưu đánh giá
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Trạng thái bài tập">
            <FormSelect
              value={exerciseForm.status}
              onChange={(event) => setExerciseForm((prev) => ({ ...prev, status: event.target.value }))}
              options={exerciseStatusOptions}
              placeholder="Chọn trạng thái"
            />
          </FormField>
          <FormField label="Điểm (0 - 10)">
            <FormInput
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={exerciseForm.score}
              onChange={(event) => setExerciseForm((prev) => ({ ...prev, score: event.target.value }))}
            />
          </FormField>
          <FormField label="Nhận xét huấn luyện viên">
            <FormTextarea
              rows={5}
              maxLength={255}
              value={exerciseForm.trainerNotes}
              onChange={(event) =>
                setExerciseForm((prev) => ({ ...prev, trainerNotes: event.target.value }))
              }
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default TrainingProgressPage;

