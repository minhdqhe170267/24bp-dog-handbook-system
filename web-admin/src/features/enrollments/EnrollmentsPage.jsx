import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  Button,
  ConfirmDialog,
  FormField,
  FormSelect,
  FormTextarea,
  Modal,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogTrainingEnrollmentService } from '../../services/dogTrainingEnrollmentService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import api from '../../services/api';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';
import { sortByNewest } from '../../utils/sortByNewest';

const statusFilterOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ENROLLED', label: 'Đã ghi danh' },
  { value: 'IN_PROGRESS', label: 'Đang huấn luyện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'SUSPENDED', label: 'Tạm dừng' },
  { value: 'WITHDRAWN', label: 'Đã rút' },
];

const defaultEnrollForm = {
  dogId: '',
  roadmapId: '',
  assignedTrainerId: '',
  notes: '',
};

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: String(value), date: '' };
  const two = (num) => String(num).padStart(2, '0');
  return {
    time: `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`,
    date: `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const toPositiveInt = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const EnrollmentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [dogs, setDogs] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [dogFilter, setDogFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState(defaultEnrollForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [lastDeletedEnrollmentId, setLastDeletedEnrollmentId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const routeDogId = searchParams.get('dogId');
    const routeTrainerId = searchParams.get('trainerId');
    const routeAction = String(searchParams.get('action') || '').toLowerCase();
    if (routeDogId) setDogFilter(routeDogId);
    if (routeTrainerId) setTrainerFilter(routeTrainerId);
    if (routeAction === 'enroll') setEnrollModalOpen(true);

    const stateDeletedId = location.state?.lastDeletedEnrollmentId;
    if (stateDeletedId != null) {
      setLastDeletedEnrollmentId(stateDeletedId);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const fetchLookups = async () => {
    setLoadingLookup(true);
    try {
      const [allDogs, trainerList, allRoadmaps] = await Promise.all([
        fetchAllPages((pageIndex, batchSize) => dogService.getAll(pageIndex, batchSize, '')),
        userService.getAllByRole('TRAINER'),
        fetchAllPages((pageIndex, batchSize) =>
          api.get(`/roadmaps?page=${pageIndex}&size=${batchSize}&sort=updatedAt,desc&sort=createdAt,desc`)
        ),
      ]);

      const publishedRoadmaps = allRoadmaps.filter(
        (roadmap) => String(roadmap?.status || '').toUpperCase() === 'PUBLISHED'
      );

      setDogs(allDogs || []);
      setTrainers(trainerList || []);
      setRoadmaps(publishedRoadmaps);
    } catch (error) {
      toast.error(error, { title: 'Không tải được dữ liệu danh mục cho ghi danh' });
    } finally {
      setLoadingLookup(false);
    }
  };

  const fetchEnrollments = async (nextPage = page, nextPageSize = pageSize) => {
    setLoadingData(true);
    try {
      const selectedDogId = toPositiveInt(dogFilter);
      const selectedTrainerId = toPositiveInt(trainerFilter);
      let rows = [];

      if (selectedDogId) {
        const response = await dogTrainingEnrollmentService.getByDog(selectedDogId);
        rows = response?.data || [];
      } else if (selectedTrainerId) {
        const response = await dogTrainingEnrollmentService.getByTrainer(selectedTrainerId);
        rows = response?.data || [];
      } else {
        // "Tất cả chó" + "Tất cả huấn luyện viên": gom toàn bộ ghi danh từ tất cả trainer.
        const trainerIds = (trainers || [])
          .map((trainer) => Number(trainer?.userId))
          .filter((trainerId) => Number.isFinite(trainerId) && trainerId > 0);

        if (trainerIds.length > 0) {
          const settledResponses = await Promise.allSettled(
            trainerIds.map((trainerId) => dogTrainingEnrollmentService.getByTrainer(trainerId))
          );

          rows = settledResponses.flatMap((result) => {
            if (result.status !== 'fulfilled') return [];
            const payload = result.value?.data;
            return Array.isArray(payload) ? payload : [];
          });

          rows = Array.from(
            new Map(
              rows.map((item) => [
                item?.enrollmentId ??
                  `${item?.dogName || ''}-${item?.roadmapName || ''}-${item?.trainerName || ''}-${item?.enrolledAt || ''}`,
                item,
              ])
            ).values()
          );
        }
      }

      const normalizedSearch = search.trim().toLowerCase();
      const filteredRows = rows.filter((item) => {
        const byStatus = statusFilter === 'all' || String(item?.status || '').toUpperCase() === statusFilter;
        if (!byStatus) return false;
        if (!normalizedSearch) return true;

        return [
          item?.dogName,
          item?.roadmapName,
          item?.trainerName,
          item?.breedName,
          item?.targetRole,
        ]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes(normalizedSearch));
      });

      const sortedRows = sortByNewest(filteredRows, {
        idKeys: ['enrollmentId', 'id'],
        dateKeys: ['enrolledAt', 'updatedAt', 'createdAt'],
      });
      const paginationResult = paginateRows(sortedRows, nextPage, nextPageSize);
      setItems(paginationResult.pageRows);
      setTotalItems(paginationResult.totalItems);
      if (paginationResult.effectivePage !== nextPage) setPage(paginationResult.effectivePage);
    } catch (error) {
      toast.error(error, { title: 'Không tải được danh sách ghi danh huấn luyện' });
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEnrollments(page, pageSize);
  }, [page, pageSize, search, statusFilter, dogFilter, trainerFilter, trainers]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateEnrollForm = (key, value) =>
    setEnrollForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const openEnrollModal = () => {
    setEnrollForm({
      ...defaultEnrollForm,
      dogId: dogFilter || '',
      assignedTrainerId: trainerFilter || '',
    });
    setEnrollModalOpen(true);
  };

  const closeEnrollModal = () => {
    if (savingEnroll) return;
    setEnrollModalOpen(false);
    setEnrollForm(defaultEnrollForm);
  };

  const handleEnrollDog = async (event) => {
    event.preventDefault();
    const dogId = toPositiveInt(enrollForm.dogId);
    const roadmapId = toPositiveInt(enrollForm.roadmapId);
    const assignedTrainerId = toPositiveInt(enrollForm.assignedTrainerId);

    if (!dogId || !roadmapId || !assignedTrainerId) {
      toast.error('Vui lòng chọn đầy đủ chó, lộ trình và huấn luyện viên.');
      return;
    }

    setSavingEnroll(true);
    try {
      await dogTrainingEnrollmentService.create({
        dogId,
        roadmapId,
        assignedTrainerId,
        notes: String(enrollForm.notes || '').trim() || null,
      });
      toast.success('Ghi danh chó vào lộ trình thành công');
      setEnrollModalOpen(false);
      setEnrollForm(defaultEnrollForm);
      if (!dogFilter && !trainerFilter) {
        setDogFilter(String(dogId));
      }
      setPage(0);
      await fetchEnrollments(0, pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể ghi danh chó vào lộ trình' });
    } finally {
      setSavingEnroll(false);
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!deleteTarget?.enrollmentId) return;
    setDeleting(true);
    try {
      await dogTrainingEnrollmentService.delete(deleteTarget.enrollmentId);
      toast.success('Đã xóa mềm ghi danh huấn luyện');
      setLastDeletedEnrollmentId(deleteTarget.enrollmentId);
      setDeleteTarget(null);
      await fetchEnrollments(page, pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể xóa ghi danh huấn luyện' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreEnrollment = async () => {
    if (!lastDeletedEnrollmentId) return;
    setRestoring(true);
    try {
      await dogTrainingEnrollmentService.restore(lastDeletedEnrollmentId);
      toast.success('Khôi phục ghi danh huấn luyện thành công');
      setLastDeletedEnrollmentId(null);
      await fetchEnrollments(page, pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể khôi phục ghi danh huấn luyện' });
    } finally {
      setRestoring(false);
    }
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

  const columns = [
    {
      key: 'dogName',
      header: 'Chó',
      className: 'w-44',
      render: (row) => <span className="font-medium">{row?.dogName || '—'}</span>,
    },
    {
      key: 'roadmapName',
      header: 'Lộ trình',
      render: (row) => row?.roadmapName || '—',
    },
    {
      key: 'trainerName',
      header: 'Huấn luyện viên',
      className: 'w-48',
      render: (row) => row?.trainerName || '—',
    },
    {
      key: 'phase',
      header: 'Tiến độ phase',
      className: 'w-32',
      render: (row) => `${row?.currentPhase || 0}/${row?.totalPhases || 0}`,
    },
    {
      key: 'progressPercent',
      header: 'Hoàn thành',
      className: 'w-44',
      render: (row) => {
        const percent = Number(row?.progressPercent || 0);
        const normalized = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
        return (
          <div>
            <div className="text-xs font-medium text-foreground mb-1">{normalized.toFixed(2)}%</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${normalized}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-36',
      render: (row) => <StatusBadge status={row?.status} />,
    },
    {
      key: 'enrolledAt',
      header: 'Ngày ghi danh',
      className: 'w-44',
      render: (row) => renderDateTimeCell(row?.enrolledAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-32',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Xem chi tiết"
            onClick={() => navigate(`/enrollments/${row?.enrollmentId}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Xóa mềm"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const pageLoading = loadingLookup || loadingData;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ghi danh huấn luyện"
        description="Quản lý ghi danh chó vào chương trình lộ trình và theo dõi tiến độ"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ghi danh huấn luyện' },
        ]}
        actions={(
          <div className="flex items-center gap-2">
            {lastDeletedEnrollmentId ? (
              <Button
                variant="outline"
                onClick={handleRestoreEnrollment}
                loading={restoring}
                className="whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                Khôi phục ghi danh vừa xóa
              </Button>
            ) : null}
            <Button onClick={openEnrollModal} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
              <Plus className="h-4 w-4" />
              Ghi danh mới
            </Button>
          </div>
        )}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo chó, lộ trình, huấn luyện viên..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
          />
        </div>
        <FilterSelect
          value={dogFilter}
          onChange={(value) => {
            setDogFilter(value);
            if (value) setTrainerFilter('');
            setPage(0);
          }}
          options={[
            { value: '', label: 'Tất cả chó' },
            ...dogs.map((dog) => ({
              value: String(dog.dogId),
              label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
            })),
          ]}
          className="w-[240px]"
        />
        <FilterSelect
          value={trainerFilter}
          onChange={(value) => {
            setTrainerFilter(value);
            if (value) setDogFilter('');
            setPage(0);
          }}
          options={[
            { value: '', label: 'Tất cả huấn luyện viên' },
            ...trainers.map((trainer) => ({
              value: String(trainer.userId),
              label: `${trainer.fullName} (${trainer.username})`,
            })),
          ]}
          className="w-[250px]"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          options={statusFilterOptions}
          className="w-[190px]"
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={pageLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        emptyMessage="Không có ghi danh huấn luyện phù hợp"
      />

      <Modal
        open={enrollModalOpen}
        onClose={closeEnrollModal}
        title="Ghi danh chó vào lộ trình"
        width={760}
        footer={(
          <>
            <Button variant="outline" onClick={closeEnrollModal} disabled={savingEnroll}>
              Hủy
            </Button>
            <Button onClick={handleEnrollDog} loading={savingEnroll}>
              Xác nhận ghi danh
            </Button>
          </>
        )}
      >
        <form onSubmit={handleEnrollDog}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Chó" required>
              <FormSelect
                value={enrollForm.dogId}
                onChange={(event) => updateEnrollForm('dogId', event.target.value)}
                options={dogs.map((dog) => ({
                  value: String(dog.dogId),
                  label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
                }))}
                placeholder="Chọn chó"
              />
            </FormField>
            <FormField label="Huấn luyện viên" required>
              <FormSelect
                value={enrollForm.assignedTrainerId}
                onChange={(event) => updateEnrollForm('assignedTrainerId', event.target.value)}
                options={trainers.map((trainer) => ({
                  value: String(trainer.userId),
                  label: `${trainer.fullName} (${trainer.username})`,
                }))}
                placeholder="Chọn huấn luyện viên"
              />
            </FormField>
          </div>
          <FormField label="Lộ trình huấn luyện" required>
            <FormSelect
              value={enrollForm.roadmapId}
              onChange={(event) => updateEnrollForm('roadmapId', event.target.value)}
              options={roadmaps.map((roadmap) => ({
                value: String(roadmap.roadmapId),
                label: roadmap.roadmapName,
              }))}
              placeholder="Chọn lộ trình đã xuất bản"
            />
          </FormField>
          <FormField label="Ghi chú">
            <FormTextarea
              rows={4}
              maxLength={255}
              value={enrollForm.notes}
              onChange={(event) => updateEnrollForm('notes', event.target.value)}
              placeholder="Ghi chú ban đầu cho quá trình huấn luyện"
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xóa mềm ghi danh"
        description="Bạn có chắc chắn muốn xóa mềm ghi danh này không?"
        onConfirm={handleDeleteEnrollment}
        confirmLabel="Xóa mềm"
        loading={deleting}
      />
    </div>
  );
};

export default EnrollmentsPage;

