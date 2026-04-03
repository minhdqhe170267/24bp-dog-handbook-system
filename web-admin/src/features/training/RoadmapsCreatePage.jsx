import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { Button, FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getLevelLabel, getStatusLabel } from '../../utils/enumLabels';
import { validateRoadmapForm } from '../../utils/formValidation';
import { fetchAllPages } from '../../utils/clientPagination';

const createEmptyPhase = (order = 1) => ({
  phaseName: '',
  phaseOrder: String(order),
  phaseDurationWeeks: '',
  phaseObjectives: '',
  assessmentCriteria: '',
  exerciseIds: [],
});

const defaultForm = {
  roadmapName: '',
  breedId: '',
  targetRole: '',
  totalDurationWeeks: '',
  description: '',
  phases: [createEmptyPhase(1)],
};

const toNullableInt = (value) => {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
};

const normalizePhaseFromDetail = (phase, fallbackOrder) => {
  const exerciseIds = Array.isArray(phase?.exercises)
    ? phase.exercises
        .map((exercise) => Number(exercise?.exerciseId))
        .filter((exerciseId) => Number.isFinite(exerciseId) && exerciseId > 0)
    : [];

  return {
    phaseName: phase?.phaseName || '',
    phaseOrder: String(phase?.phaseOrder ?? fallbackOrder),
    phaseDurationWeeks: phase?.phaseDurationWeeks ?? '',
    phaseObjectives: phase?.phaseObjectives || '',
    assessmentCriteria: phase?.assessmentCriteria || '',
    exerciseIds,
  };
};

const RoadmapsCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const parsedRouteId = Number(id);
  const entityIdFromRoute = Number.isFinite(parsedRouteId) ? parsedRouteId : null;
  const isEditMode = entityIdFromRoute != null;
  const toast = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [entityId, setEntityId] = useState(null);
  const [entityStatus, setEntityStatus] = useState('DRAFT');
  const [formData, setFormData] = useState(defaultForm);
  const [breeds, setBreeds] = useState([]);
  const [exercises, setExercises] = useState([]);
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const updatePhaseField = (index, key, value) => {
    setFormData((prev) => {
      const nextPhases = [...prev.phases];
      nextPhases[index] = {
        ...nextPhases[index],
        [key]: value,
      };
      return {
        ...prev,
        phases: nextPhases,
      };
    });
  };

  const toggleExerciseInPhase = (index, exerciseId) => {
    setFormData((prev) => {
      const nextPhases = [...prev.phases];
      const currentIds = Array.isArray(nextPhases[index]?.exerciseIds)
        ? nextPhases[index].exerciseIds
        : [];
      const targetId = Number(exerciseId);
      const nextIds = currentIds.includes(targetId)
        ? currentIds.filter((id) => id !== targetId)
        : [...currentIds, targetId];

      nextPhases[index] = {
        ...nextPhases[index],
        exerciseIds: nextIds,
      };
      return {
        ...prev,
        phases: nextPhases,
      };
    });
  };

  const addPhase = () => {
    setFormData((prev) => {
      const maxOrder = prev.phases.reduce((max, phase) => {
        const order = Number(phase?.phaseOrder || 0);
        return Number.isFinite(order) && order > max ? order : max;
      }, 0);
      return {
        ...prev,
        phases: [...prev.phases, createEmptyPhase(maxOrder + 1)],
      };
    });
  };

  const removePhase = (index) => {
    setFormData((prev) => {
      if (prev.phases.length <= 1) return prev;
      return {
        ...prev,
        phases: prev.phases.filter((_, currentIndex) => currentIndex !== index),
      };
    });
  };

  const buildPayload = () => ({
    roadmapName: formData.roadmapName.trim(),
    breedId: toNullableInt(formData.breedId),
    targetRole: formData.targetRole.trim() || null,
    totalDurationWeeks: toNullableInt(formData.totalDurationWeeks),
    description: formData.description.trim() || null,
    phases: formData.phases.map((phase, index) => ({
      phaseName: String(phase?.phaseName || '').trim(),
      phaseOrder: toNullableInt(phase?.phaseOrder) || index + 1,
      phaseDurationWeeks: toNullableInt(phase?.phaseDurationWeeks),
      phaseObjectives: String(phase?.phaseObjectives || '').trim() || null,
      assessmentCriteria: String(phase?.assessmentCriteria || '').trim() || null,
      exerciseIds: Array.from(
        new Set(
          (Array.isArray(phase?.exerciseIds) ? phase.exerciseIds : [])
            .map((exerciseId) => Number(exerciseId))
            .filter((exerciseId) => Number.isFinite(exerciseId) && exerciseId > 0)
        )
      ),
    })),
  });

  const validate = () => {
    const errors = validateRoadmapForm(formData);
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin lộ trình chưa hợp lệ',
        description: errors,
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [allBreeds, allExercises] = await Promise.all([
          fetchAllPages((pageIndex, batchSize) =>
            api.get(`/breeds?page=${pageIndex}&size=${batchSize}&sort=updatedAt,desc&sort=createdAt,desc`)
          ),
          fetchAllPages((pageIndex, batchSize) =>
            api.get(`/exercises?page=${pageIndex}&size=${batchSize}&sort=updatedAt,desc&sort=createdAt,desc`)
          ),
        ]);
        setBreeds(allBreeds || []);
        setExercises(allExercises || []);
      } catch (error) {
        toast.error(error, { title: 'Không tải được dữ liệu giống chó hoặc bài tập' });
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [toast]);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/roadmaps/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.roadmapId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        const detailPhases = Array.isArray(detail?.phases) ? detail.phases : [];
        const normalizedPhases =
          detailPhases.length > 0
            ? detailPhases
                .slice()
                .sort((left, right) => Number(left?.phaseOrder || 0) - Number(right?.phaseOrder || 0))
                .map((phase, index) => normalizePhaseFromDetail(phase, index + 1))
            : [
                {
                  phaseName: detail.phaseName || '',
                  phaseOrder: String(detail.phaseOrder ?? 1),
                  phaseDurationWeeks: detail.phaseDurationWeeks ?? '',
                  phaseObjectives: detail.phaseObjectives || '',
                  assessmentCriteria: detail.assessmentCriteria || '',
                  exerciseIds: Array.isArray(detail?.exercises)
                    ? detail.exercises
                        .map((exercise) => Number(exercise?.exerciseId))
                        .filter((exerciseId) => Number.isFinite(exerciseId) && exerciseId > 0)
                    : [],
                },
              ];

        setFormData({
          roadmapName: detail.roadmapName || '',
          breedId: detail.breedId ?? '',
          targetRole: detail.targetRole || '',
          totalDurationWeeks: detail.totalDurationWeeks ?? '',
          description: detail.description || '',
          phases: normalizedPhases.length > 0 ? normalizedPhases : [createEmptyPhase(1)],
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết lộ trình' });
        navigate('/training/roadmaps');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [entityIdFromRoute, isEditMode, navigate, toast]);

  const persistEntity = async () => {
    if (!validate()) return null;
    const payload = buildPayload();
    const targetId = entityId || entityIdFromRoute;
    const res = targetId
      ? await api.put(`/roadmaps/${targetId}`, payload)
      : await api.post('/roadmaps', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.roadmapId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();
    if (!nextId) throw new Error('Không lấy được ID lộ trình');
    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp lộ trình' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      await approvalService.submit(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, saved.id);
      toast.success('Đã gửi duyệt lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt lộ trình' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!canPublish) {
      toast.error('Bạn không có quyền xuất bản');
      return;
    }
    if (!entityId || entityStatus !== 'APPROVED') {
      toast.error('Chỉ xuất bản khi bản ghi đã ở trạng thái ĐÃ DUYỆT');
      return;
    }
    setPublishing(true);
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, entityId);
      toast.success('Đã xuất bản lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản lộ trình' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa lộ trình huấn luyện' : 'Tạo lộ trình huấn luyện'}
      description={isEditMode ? 'Cập nhật lộ trình huấn luyện' : 'Thêm lộ trình huấn luyện mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lộ trình', href: '/training/roadmaps' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="roadmap-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/training/roadmaps')}
      saving={saving || loadingDetail || loadingLookups}
      saveLabel="Gửi duyệt"
      actionHint={`Trạng thái hiện tại: ${getStatusLabel(entityStatus)}`}
      extraActions={[
        { key: 'draft', label: 'Lưu nháp', onClick: handleSaveDraft, loading: savingDraft },
        {
          key: 'publish',
          label: 'Xuất bản',
          onClick: handlePublish,
          loading: publishing,
          disabled: !canPublish || entityStatus !== 'APPROVED' || !entityId,
          variant: 'success',
        },
      ]}
    >
      <FormField label="Tên lộ trình" required>
        <FormInput maxLength={200} value={formData.roadmapName} onChange={(e) => updateField('roadmapName', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Giống chó">
          <FormSelect
            value={formData.breedId}
            onChange={(event) => updateField('breedId', event.target.value)}
            options={[
              { value: '', label: 'Tất cả giống' },
              ...breeds.map((breed) => ({
                value: String(breed?.breedId),
                label: breed?.breedName || `Giống #${breed?.breedId}`,
              })),
            ]}
            placeholder="Tất cả giống"
          />
        </FormField>
        <FormField label="Vai trò mục tiêu">
          <FormInput
            maxLength={100}
            value={formData.targetRole}
            onChange={(e) => updateField('targetRole', e.target.value)}
          />
        </FormField>
        <FormField label="Tổng thời gian (tuần)">
          <FormInput
            type="number"
            min="1"
            max="104"
            step="1"
            value={formData.totalDurationWeeks}
            onChange={(e) => updateField('totalDurationWeeks', e.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Mô tả">
        <FormTextarea maxLength={5000} rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Danh sách giai đoạn</h3>
          <Button type="button" variant="outline" size="sm" onClick={addPhase}>
            <Plus className="h-4 w-4" />
            Thêm giai đoạn
          </Button>
        </div>

        {formData.phases.map((phase, index) => (
          <div key={`phase-${index}`} className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Giai đoạn {index + 1}</p>
              {formData.phases.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePhase(index)}
                  title="Xóa giai đoạn"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Tên giai đoạn" required>
                <FormInput
                  maxLength={100}
                  value={phase.phaseName}
                  onChange={(event) => updatePhaseField(index, 'phaseName', event.target.value)}
                />
              </FormField>
              <FormField label="Thứ tự giai đoạn" required>
                <FormInput
                  type="number"
                  min="1"
                  step="1"
                  value={phase.phaseOrder}
                  onChange={(event) => updatePhaseField(index, 'phaseOrder', event.target.value)}
                />
              </FormField>
              <FormField label="Thời gian giai đoạn (tuần)">
                <FormInput
                  type="number"
                  min="1"
                  max="52"
                  step="1"
                  value={phase.phaseDurationWeeks}
                  onChange={(event) => updatePhaseField(index, 'phaseDurationWeeks', event.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Mục tiêu giai đoạn">
              <FormTextarea
                maxLength={5000}
                rows={2}
                value={phase.phaseObjectives}
                onChange={(event) => updatePhaseField(index, 'phaseObjectives', event.target.value)}
              />
            </FormField>
            <FormField label="Tiêu chí đánh giá">
              <FormTextarea
                maxLength={5000}
                rows={2}
                value={phase.assessmentCriteria}
                onChange={(event) => updatePhaseField(index, 'assessmentCriteria', event.target.value)}
              />
            </FormField>

            <FormField label="Bài tập của giai đoạn">
              <div className="rounded-lg border border-border/60 bg-card p-3 max-h-56 overflow-y-auto space-y-2">
                {exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa có bài tập để chọn</p>
                ) : (
                  exercises.map((exercise) => {
                    const exerciseId = Number(exercise?.exerciseId);
                    if (!Number.isFinite(exerciseId)) return null;
                    const checked = phase.exerciseIds.includes(exerciseId);
                    return (
                      <label
                        key={`phase-${index}-exercise-${exerciseId}`}
                        className="flex items-start gap-2 text-sm text-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleExerciseInPhase(index, exerciseId)}
                        />
                        <span>
                          <span className="font-medium">{exercise?.exerciseName || `Bài tập #${exerciseId}`}</span>
                          {exercise?.difficultyLevel ? (
                            <span className="text-muted-foreground">
                              {' '}
                              • {getLevelLabel(exercise.difficultyLevel)}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </FormField>
          </div>
        ))}
      </div>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default RoadmapsCreatePage;
