import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  Button,
  ConfirmDialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  Modal,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import {
  dogTrainingEnrollmentService,
  ENROLLMENT_STATUSES,
  EXERCISE_PROGRESS_STATUSES,
} from '../../services/dogTrainingEnrollmentService';

const enrollmentStatusOptions = ENROLLMENT_STATUSES.map((value) => ({
  value,
  label:
    value === 'ENROLLED'
      ? 'Đã ghi danh'
      : value === 'IN_PROGRESS'
      ? 'Đang huấn luyện'
      : value === 'COMPLETED'
      ? 'Hoàn thành'
      : value === 'SUSPENDED'
      ? 'Tạm dừng'
      : 'Đã rút',
}));

const exerciseStatusOptions = EXERCISE_PROGRESS_STATUSES.map((value) => ({
  value,
  label:
    value === 'NOT_STARTED'
      ? 'Chưa bắt đầu'
      : value === 'IN_PROGRESS'
      ? 'Đang huấn luyện'
      : value === 'COMPLETED'
      ? 'Hoàn thành'
      : 'Bỏ qua',
}));

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
};

const toNullableDecimal = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const EnrollmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const enrollmentId = Number(id);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
  });

  const [evaluateModalOpen, setEvaluateModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [evaluateForm, setEvaluateForm] = useState({
    status: 'NOT_STARTED',
    score: '',
    trainerNotes: '',
  });

  const fetchDetail = useCallback(async () => {
    if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
      toast.error('ID ghi danh không hợp lệ');
      navigate('/enrollments', { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await dogTrainingEnrollmentService.getById(enrollmentId);
      const payload = response?.data || response || null;
      setDetail(payload);
      setStatusForm({
        status: String(payload?.status || '').toUpperCase() || 'ENROLLED',
        notes: '',
      });
    } catch (error) {
      toast.error(error, { title: 'Không tải được chi tiết ghi danh huấn luyện' });
      navigate('/enrollments', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, navigate, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const progressPercent = useMemo(() => {
    const value = Number(detail?.progressPercent || 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }, [detail?.progressPercent]);

  const handleUpdateEnrollment = async (event) => {
    event.preventDefault();
    if (!statusForm.status) {
      toast.error('Vui lòng chọn trạng thái ghi danh');
      return;
    }

    setUpdateStatusLoading(true);
    try {
      await dogTrainingEnrollmentService.update(enrollmentId, {
        status: statusForm.status,
        notes: String(statusForm.notes || '').trim() || null,
      });
      toast.success('Cập nhật trạng thái ghi danh thành công');
      await fetchDetail();
    } catch (error) {
      toast.error(error, { title: 'Không thể cập nhật trạng thái ghi danh' });
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    setDeleteLoading(true);
    try {
      await dogTrainingEnrollmentService.delete(enrollmentId);
      toast.success('Đã xóa mềm ghi danh huấn luyện');
      navigate('/enrollments', {
        replace: true,
        state: { lastDeletedEnrollmentId: enrollmentId },
      });
    } catch (error) {
      toast.error(error, { title: 'Không thể xóa mềm ghi danh huấn luyện' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEvaluateModal = (exercise) => {
    setSelectedExercise(exercise);
    setEvaluateForm({
      status: String(exercise?.status || '').toUpperCase() || 'NOT_STARTED',
      score: exercise?.score ?? '',
      trainerNotes: exercise?.trainerNotes || '',
    });
    setEvaluateModalOpen(true);
  };

  const closeEvaluateModal = () => {
    if (evaluateLoading) return;
    setEvaluateModalOpen(false);
    setSelectedExercise(null);
    setEvaluateForm({
      status: 'NOT_STARTED',
      score: '',
      trainerNotes: '',
    });
  };

  const handleEvaluateExercise = async () => {
    if (!selectedExercise?.exerciseId) return;
    if (!evaluateForm.status) {
      toast.error('Vui lòng chọn trạng thái bài tập');
      return;
    }
    if (evaluateForm.status === 'NOT_STARTED' && evaluateForm.score !== '' && evaluateForm.score != null) {
      toast.error('Bài tập chưa bắt đầu thì không thể nhập điểm');
      return;
    }
    const parsedScore = toNullableDecimal(evaluateForm.score);
    if (evaluateForm.score !== '' && parsedScore == null) {
      toast.error('Điểm số không hợp lệ');
      return;
    }
    if (parsedScore != null && (parsedScore < 0 || parsedScore > 10)) {
      toast.error('Điểm số phải trong khoảng 0 đến 10');
      return;
    }

    setEvaluateLoading(true);
    try {
      await dogTrainingEnrollmentService.evaluate(enrollmentId, {
        exerciseId: selectedExercise.exerciseId,
        status: evaluateForm.status,
        score: parsedScore,
        trainerNotes: String(evaluateForm.trainerNotes || '').trim() || null,
      });
      toast.success('Đánh giá bài tập thành công');
      setEvaluateModalOpen(false);
      setSelectedExercise(null);
      await fetchDetail();
    } catch (error) {
      toast.error(error, { title: 'Không thể đánh giá bài tập' });
    } finally {
      setEvaluateLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Chi tiết ghi danh huấn luyện"
        description="Theo dõi tiến độ theo giai đoạn và bài tập huấn luyện"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ghi danh huấn luyện', href: '/enrollments' },
          { label: 'Chi tiết' },
        ]}
        actions={(
          <Button variant="outline" onClick={() => navigate('/enrollments')}>
            Quay lại danh sách
          </Button>
        )}
      />

      {loading ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Đang tải dữ liệu...
        </div>
      ) : !detail ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Không có dữ liệu ghi danh
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Tên chó">
                  <FormInput readOnly disabled value={detail?.dogName || '—'} className="bg-muted/50" />
                </FormField>
                <FormField label="Giống chó">
                  <FormInput readOnly disabled value={detail?.breedName || '—'} className="bg-muted/50" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Lộ trình">
                  <FormInput readOnly disabled value={detail?.roadmapName || '—'} className="bg-muted/50" />
                </FormField>
                <FormField label="Vai trò mục tiêu">
                  <FormInput readOnly disabled value={detail?.targetRole || '—'} className="bg-muted/50" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField label="Huấn luyện viên">
                  <FormInput readOnly disabled value={detail?.trainerName || '—'} className="bg-muted/50" />
                </FormField>
                <FormField label="Giai đoạn hiện tại">
                  <FormInput
                    readOnly
                    disabled
                    value={`${detail?.currentPhase || 0}/${detail?.totalPhases || 0}`}
                    className="bg-muted/50"
                  />
                </FormField>
                <FormField label="Ngày ghi danh">
                  <FormInput readOnly disabled value={formatDateTime(detail?.enrolledAt)} className="bg-muted/50" />
                </FormField>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Tiến độ tổng</h3>
                  <span className="text-sm font-semibold text-foreground">{progressPercent.toFixed(2)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Trạng thái hiện tại</h3>
                <StatusBadge status={detail?.status} />
              </div>
              <form onSubmit={handleUpdateEnrollment} className="space-y-2">
                <FormField label="Cập nhật trạng thái">
                  <FormSelect
                    value={statusForm.status}
                    onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
                    options={enrollmentStatusOptions}
                  />
                </FormField>
                <FormField label="Ghi chú cập nhật">
                  <FormTextarea
                    rows={4}
                    maxLength={5000}
                    value={statusForm.notes}
                    onChange={(event) => setStatusForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Nhập ghi chú khi cập nhật trạng thái (nếu có)"
                  />
                </FormField>
                <div className="pt-1 space-y-2">
                  <Button type="submit" loading={updateStatusLoading} className="w-full">
                    <Pencil className="h-4 w-4" />
                    Cập nhật trạng thái
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa mềm ghi danh
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tiến độ theo giai đoạn</h3>
            <div className="space-y-3">
              {(detail?.phases || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có dữ liệu tiến độ bài tập.</div>
              ) : (
                (detail?.phases || []).map((phase, phaseIndex) => (
                  <div key={`${phase?.phaseOrder || phaseIndex}-${phase?.phaseName || ''}`} className="border border-border/60 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/40 border-b border-border/60">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-sm text-foreground">
                          Giai đoạn {phase?.phaseOrder || '-'}: {phase?.phaseName || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hoàn thành {phase?.completedExercises || 0}/{phase?.totalExercises || 0} bài tập
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {(phase?.exercises || []).map((exercise) => (
                        <div key={exercise?.progressId || `${phaseIndex}-${exercise?.exerciseId}`} className="px-4 py-3">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:items-center">
                            <div className="lg:col-span-4">
                              <div className="text-sm font-medium text-foreground">{exercise?.exerciseName || '—'}</div>
                              <div className="text-xs text-muted-foreground">ID bài tập: {exercise?.exerciseId || '—'}</div>
                            </div>
                            <div className="lg:col-span-2">
                              <StatusBadge status={exercise?.status} />
                            </div>
                            <div className="lg:col-span-2 text-sm text-foreground">
                              Điểm: {exercise?.score == null ? '—' : exercise?.score}
                            </div>
                            <div className="lg:col-span-3 text-xs text-muted-foreground">
                              {exercise?.trainerNotes ? (
                                <span>{exercise.trainerNotes}</span>
                              ) : (
                                <span>Chưa có nhận xét</span>
                              )}
                              <div>{formatDateTime(exercise?.completedAt)}</div>
                            </div>
                            <div className="lg:col-span-1 lg:text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEvaluateModal(exercise)}
                                className="whitespace-nowrap"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                Đánh giá
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={evaluateModalOpen}
        onClose={closeEvaluateModal}
        title="Đánh giá bài tập"
        width={640}
        footer={(
          <>
            <Button variant="outline" onClick={closeEvaluateModal} disabled={evaluateLoading}>
              Hủy
            </Button>
            <Button onClick={handleEvaluateExercise} loading={evaluateLoading}>
              Lưu đánh giá
            </Button>
          </>
        )}
      >
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Bài tập: <span className="font-medium text-foreground">{selectedExercise?.exerciseName || '—'}</span>
          </div>
          <FormField label="Trạng thái bài tập" required>
            <FormSelect
              value={evaluateForm.status}
              onChange={(event) => setEvaluateForm((prev) => ({ ...prev, status: event.target.value }))}
              options={exerciseStatusOptions}
            />
          </FormField>
          <FormField label="Điểm số (0 - 10)">
            <FormInput
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={evaluateForm.score}
              onChange={(event) => setEvaluateForm((prev) => ({ ...prev, score: event.target.value }))}
              placeholder="Nhập điểm số nếu có"
            />
          </FormField>
          <FormField label="Nhận xét của huấn luyện viên">
            <FormTextarea
              rows={4}
              maxLength={5000}
              value={evaluateForm.trainerNotes}
              onChange={(event) => setEvaluateForm((prev) => ({ ...prev, trainerNotes: event.target.value }))}
              placeholder="Nhập nhận xét..."
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Xóa mềm ghi danh huấn luyện"
        description="Bạn có chắc chắn muốn xóa mềm ghi danh này không?"
        onConfirm={handleSoftDelete}
        confirmLabel="Xóa mềm"
        loading={deleteLoading}
      />
    </div>
  );
};

export default EnrollmentDetailPage;

