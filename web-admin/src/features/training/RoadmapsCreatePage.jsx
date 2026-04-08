import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { Button, FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';
import { validateRoadmapForm } from '../../utils/formValidation';
import { breedService } from '../../services/breedService';
import { trainingService } from '../../services/trainingService';
import trainingSpecialtyService from '../../services/trainingSpecialtyService';
import { fetchAllPages } from '../../utils/clientPagination';

const createDefaultPhase = (phaseOrder = 1) => ({
  phaseId: null,
  phaseName: '',
  phaseOrder: phaseOrder,
  phaseDurationWeeks: '',
  phaseObjectives: '',
  assessmentCriteria: '',
  exerciseIds: [],
});

const defaultForm = {
  roadmapName: '',
  specialtyId: '',
  roadmapOrder: '1',
  breedId: '',
  targetRole: '',
  totalDurationWeeks: '',
  description: '',
  phases: [createDefaultPhase(1)],
};

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
  const [specialties, setSpecialties] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const exerciseUsageMap = useMemo(() => {
    const usage = new Map();
    formData.phases.forEach((phase, phaseIndex) => {
      (Array.isArray(phase.exerciseIds) ? phase.exerciseIds : []).forEach((exerciseIdRaw) => {
        const exerciseId = Number(exerciseIdRaw);
        if (!Number.isFinite(exerciseId)) return;
        const current = usage.get(exerciseId) || [];
        if (!current.includes(phaseIndex)) current.push(phaseIndex);
        usage.set(exerciseId, current);
      });
    });
    return usage;
  }, [formData.phases]);

  const specialtyOptions = useMemo(
    () =>
      specialties.map((item) => ({
        value: String(item.specialtyId),
        label: `${item.specialtyCode} - ${item.specialtyName}`,
      })),
    [specialties]
  );

  const breedOptions = useMemo(
    () => [
      { value: '', label: 'Áp dụng mọi giống chó' },
      ...breeds.map((breed) => ({
        value: String(breed.breedId),
        label: breed.breedName,
      })),
    ],
    [breeds]
  );

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updatePhase = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      phases: prev.phases.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
            ...phase,
            [key]: value,
          }
          : phase
      ),
    }));
  };

  const togglePhaseExercise = (phaseIndex, exerciseId) => {
    setFormData((prev) => ({
      ...prev,
      phases: prev.phases.map((phase, index) => {
        if (index !== phaseIndex) return phase;
        const normalizedId = Number(exerciseId);
        const exists = phase.exerciseIds.includes(normalizedId);
        return {
          ...phase,
          exerciseIds: exists
            ? phase.exerciseIds.filter((id) => id !== normalizedId)
            : [...phase.exerciseIds, normalizedId],
        };
      }),
    }));
  };

  const addPhase = () => {
    setFormData((prev) => ({
      ...prev,
      phases: [...prev.phases, createDefaultPhase(prev.phases.length + 1)],
    }));
  };

  const removePhase = (index) => {
    setFormData((prev) => {
      const nextPhases = prev.phases.filter((_, phaseIndex) => phaseIndex !== index);
      return {
        ...prev,
        phases: nextPhases.length > 0 ? nextPhases : [createDefaultPhase(1)],
      };
    });
  };

  const buildPayload = () => ({
    roadmapName: formData.roadmapName.trim(),
    specialtyId: Number(formData.specialtyId),
    roadmapOrder: toNumberOrNull(formData.roadmapOrder) ?? 1,
    breedId: toNumberOrNull(formData.breedId),
    targetRole: formData.targetRole.trim() || null,
    totalDurationWeeks: toNumberOrNull(formData.totalDurationWeeks),
    description: formData.description.trim() || null,
    phases: formData.phases.map((phase, index) => ({
      phaseId: phase.phaseId || null,
      phaseName: phase.phaseName.trim(),
      phaseOrder: toNumberOrNull(phase.phaseOrder) ?? index + 1,
      phaseDurationWeeks: toNumberOrNull(phase.phaseDurationWeeks),
      phaseObjectives: phase.phaseObjectives.trim() || null,
      assessmentCriteria: phase.assessmentCriteria.trim() || null,
      exerciseIds: phase.exerciseIds.map((exerciseId) => Number(exerciseId)),
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
    let active = true;

    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [specialtyRows, breedResponse, exerciseRows] = await Promise.all([
          fetchAllPages((pageIndex, batchSize) =>
            trainingSpecialtyService.getAll(pageIndex, batchSize, '')
          ),
          breedService.getAll(0, 200, ''),
          fetchAllPages((pageIndex, batchSize) => trainingService.getExercises(pageIndex, batchSize)),
        ]);
        if (!active) return;

        setSpecialties(Array.isArray(specialtyRows) ? specialtyRows.filter((item) => item.isActive !== false) : []);
        setBreeds(breedResponse?.data?.content || []);
        setExercises(Array.isArray(exerciseRows) ? exerciseRows : []);
      } catch (error) {
        toast.error(error, { title: 'Không tải được dữ liệu tham chiếu cho lộ trình' });
      } finally {
        if (active) {
          setLoadingLookups(false);
        }
      }
    };

    loadLookups();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await api.get(`/roadmaps/${entityIdFromRoute}`);
        const detail = response?.data ?? response ?? {};
        if (!active) return;

        const nextId = detail.roadmapId || entityIdFromRoute;
        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          roadmapName: detail.roadmapName || '',
          specialtyId: detail.specialtyId ? String(detail.specialtyId) : '',
          roadmapOrder: detail.roadmapOrder != null ? String(detail.roadmapOrder) : '1',
          breedId: detail.breedId ? String(detail.breedId) : '',
          targetRole: detail.targetRole || '',
          totalDurationWeeks:
            detail.totalDurationWeeks != null ? String(detail.totalDurationWeeks) : '',
          description: detail.description || '',
          phases:
            detail.phases?.length > 0
              ? detail.phases.map((phase, index) => ({
                phaseId: phase.phaseId || null,
                phaseName: phase.phaseName || '',
                phaseOrder: phase.phaseOrder != null ? String(phase.phaseOrder) : String(index + 1),
                phaseDurationWeeks:
                  phase.phaseDurationWeeks != null ? String(phase.phaseDurationWeeks) : '',
                phaseObjectives: phase.phaseObjectives || '',
                assessmentCriteria: phase.assessmentCriteria || '',
                exerciseIds: Array.isArray(phase.exercises)
                  ? phase.exercises
                    .map((exercise) => Number(exercise.exerciseId))
                    .filter((exerciseId) => Number.isFinite(exerciseId))
                  : [],
              }))
              : [createDefaultPhase(1)],
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết lộ trình' });
        navigate('/training/roadmaps');
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [entityIdFromRoute, isEditMode, navigate, toast]);

  const persistEntity = async () => {
    if (!validate()) return null;

    const payload = buildPayload();
    const targetId = entityId || entityIdFromRoute;
    const response = targetId
      ? await api.put(`/roadmaps/${targetId}`, payload)
      : await api.post('/roadmaps', payload);
    const responseData = response?.data ?? response ?? {};
    const nextId = responseData.roadmapId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();

    if (!nextId) {
      throw new Error('Không lấy được ID lộ trình');
    }

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
      description={
        isEditMode ? 'Cập nhật lộ trình huấn luyện theo chuyên ngành' : 'Thêm lộ trình mới vào thư viện huấn luyện'
      }
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Huấn luyện' },
        { label: 'Lộ trình', href: '/training/roadmaps' },
        { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' },
      ]}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Tên lộ trình" required>
          <FormInput
            maxLength={200}
            value={formData.roadmapName}
            onChange={(event) => updateField('roadmapName', event.target.value)}
          />
        </FormField>
        <FormField label="Chuyên ngành" required>
          <FormSelect
            value={formData.specialtyId}
            onChange={(event) => updateField('specialtyId', event.target.value)}
            placeholder="Chọn chuyên ngành"
            options={specialtyOptions}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Thứ tự lộ trình" required>
          <FormInput
            type="number"
            min="1"
            step="1"
            value={formData.roadmapOrder}
            onChange={(event) => updateField('roadmapOrder', event.target.value)}
          />
        </FormField>
        <FormField label="Giống chó áp dụng">
          <FormSelect
            value={formData.breedId}
            onChange={(event) => updateField('breedId', event.target.value)}
            options={breedOptions}
          />
        </FormField>
        <FormField label="Tổng thời gian (tuần)">
          <FormInput
            type="number"
            min="1"
            max="104"
            step="1"
            value={formData.totalDurationWeeks}
            onChange={(event) => updateField('totalDurationWeeks', event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Vai trò mục tiêu">
        <FormInput
          maxLength={100}
          value={formData.targetRole}
          onChange={(event) => updateField('targetRole', event.target.value)}
        />
      </FormField>

      <FormField label="Mô tả">
        <FormTextarea
          maxLength={255}
          rows={4}
          value={formData.description}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </FormField>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Các giai đoạn</h3>
          <p className="text-sm text-muted-foreground">
            Mỗi giai đoạn có thể gắn nhiều bài tập. Toàn bộ cấu trúc này sẽ được dùng để khởi tạo tiến độ cho chó.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addPhase}>
          <Plus className="h-4 w-4" />
          Thêm giai đoạn
        </Button>
      </div>

      <div className="space-y-4">
        {formData.phases.map((phase, index) => (
          <div key={phase.phaseId || `phase-${index}`} className="rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="font-medium text-foreground">Giai đoạn {index + 1}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePhase(index)}
                disabled={formData.phases.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Tên giai đoạn" required>
                <FormInput
                  maxLength={100}
                  value={phase.phaseName}
                  onChange={(event) => updatePhase(index, 'phaseName', event.target.value)}
                />
              </FormField>
              <FormField label="Thứ tự giai đoạn" required>
                <FormInput
                  type="number"
                  min="1"
                  step="1"
                  value={phase.phaseOrder}
                  onChange={(event) => updatePhase(index, 'phaseOrder', event.target.value)}
                />
              </FormField>
              <FormField label="Thời gian giai đoạn (tuần)">
                <FormInput
                  type="number"
                  min="1"
                  max="52"
                  step="1"
                  value={phase.phaseDurationWeeks}
                  onChange={(event) => updatePhase(index, 'phaseDurationWeeks', event.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Mục tiêu giai đoạn">
              <FormTextarea
                maxLength={255}
                rows={3}
                value={phase.phaseObjectives}
                onChange={(event) => updatePhase(index, 'phaseObjectives', event.target.value)}
              />
            </FormField>

            <FormField label="Tiêu chí đánh giá">
              <FormTextarea
                maxLength={255}
                rows={3}
                value={phase.assessmentCriteria}
                onChange={(event) => updatePhase(index, 'assessmentCriteria', event.target.value)}
              />
            </FormField>

            <FormField label="Bài tập trong giai đoạn">
              <p className="text-xs text-muted-foreground mb-2">
                Bài tập đã được chọn ở giai đoạn khác sẽ bị khóa để tránh trùng lặp giữa các giai đoạn.
              </p>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exercises.map((exercise) => {
                    const exerciseId = Number(exercise.exerciseId);
                    const checked = phase.exerciseIds.includes(exerciseId);
                    const usedPhaseIndexes = exerciseUsageMap.get(exerciseId) || [];
                    const usedByOtherPhases = usedPhaseIndexes.filter((phaseIndex) => phaseIndex !== index);
                    const isLockedByOtherPhase = !checked && usedByOtherPhases.length > 0;
                    const usedByOtherPhasesLabel = usedByOtherPhases.map((phaseIndex) => `Giai đoạn ${phaseIndex + 1}`).join(', ');
                    return (
                      <label
                        key={exercise.exerciseId}
                        className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                          isLockedByOtherPhase
                            ? 'border-amber-200/60 bg-amber-500/5 opacity-60 cursor-not-allowed'
                            : 'border-transparent hover:bg-muted/50'
                        }`}
                        onClick={(event) => {
                          if (!isLockedByOtherPhase) return;
                          event.preventDefault();
                          toast.warning(`"${exercise.exerciseName}" đã được chọn ở ${usedByOtherPhasesLabel}.`);
                        }}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={isLockedByOtherPhase}
                          onChange={() => togglePhaseExercise(index, exerciseId)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {exercise.exerciseName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {exercise.difficultyLevel || '—'} · {exercise.durationMinutes || 0} phút
                          </div>
                          {isLockedByOtherPhase ? (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              Đã dùng ở {usedByOtherPhasesLabel}
                            </div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {exercises.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Chưa có bài tập nào trong thư viện.</div>
                ) : null}
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

