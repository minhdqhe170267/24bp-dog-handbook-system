import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogAssignmentService } from '../../services/dogAssignmentService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import { mapAssignmentErrorToToast } from './assignmentErrorMapper';
import { validateDogAssignmentForm } from '../../utils/formValidation';
import { fetchAllPages } from '../../utils/clientPagination';

const assignmentTypeOptions = [
  { value: 'PRIMARY', label: 'Chính' },
  { value: 'TEMPORARY', label: 'Tạm thời' },
];

const getTodayDateValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const defaultForm = {
  dogId: '',
  trainerId: '',
  assignmentType: 'PRIMARY',
  startDate: getTodayDateValue(),
  endDate: '',
  notes: '',
};

const WarningBanner = ({ message }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-sm">
    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
    <span>{message}</span>
  </div>
);

const DogAssignmentsCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const parsedRouteId = Number(id);
  const assignmentIdFromRoute = Number.isFinite(parsedRouteId) ? parsedRouteId : null;
  const isEditMode = assignmentIdFromRoute != null;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dogs, setDogs] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [formData, setFormData] = useState(() => ({ ...defaultForm }));

  const selectedTrainer = useMemo(
    () => trainers.find((trainer) => String(trainer?.userId) === String(formData.trainerId)),
    [formData.trainerId, trainers]
  );

  const assignmentType = String(formData.assignmentType || 'PRIMARY').toUpperCase();
  const isPrimaryAssignment = assignmentType === 'PRIMARY';

  // IDs of dogs and trainers that already have active PRIMARY assignments
  const assignedDogIds = useMemo(() => {
    const ids = new Set();
    for (const assignment of activeAssignments) {
      if (assignment.isActive && String(assignment.assignmentType || '').toUpperCase() === 'PRIMARY') {
        if (assignment.dogId) ids.add(String(assignment.dogId));
      }
    }
    // In edit mode, don't exclude the current assignment's dog
    if (isEditMode && formData.dogId) {
      ids.delete(String(formData.dogId));
    }
    return ids;
  }, [activeAssignments, isEditMode, formData.dogId]);

  const assignedTrainerIds = useMemo(() => {
    const ids = new Set();
    for (const assignment of activeAssignments) {
      if (assignment.isActive && String(assignment.assignmentType || '').toUpperCase() === 'PRIMARY') {
        if (assignment.trainerId) ids.add(String(assignment.trainerId));
      }
    }
    // In edit mode, don't exclude the current assignment's trainer
    if (isEditMode && formData.trainerId) {
      ids.delete(String(formData.trainerId));
    }
    return ids;
  }, [activeAssignments, isEditMode, formData.trainerId]);

  // Filter options for dropdowns — remove already-assigned
  const availableDogOptions = useMemo(
    () => dogs
      .filter((dog) => !assignedDogIds.has(String(dog.dogId)))
      .map((dog) => ({
        value: String(dog.dogId),
        label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
      })),
    [dogs, assignedDogIds]
  );

  const availableTrainerOptions = useMemo(
    () => trainers
      .filter((trainer) => !assignedTrainerIds.has(String(trainer.userId)))
      .map((trainer) => ({
        value: String(trainer.userId),
        label: `${trainer.fullName} (${trainer.specialtyName || 'Chưa có chuyên ngành'})`,
      })),
    [trainers, assignedTrainerIds]
  );

  const allDogsAssigned = dogs.length > 0 && availableDogOptions.length === 0;
  const allTrainersAssigned = trainers.length > 0 && availableTrainerOptions.length === 0;

  useEffect(() => {
    let active = true;

    const fetchLookup = async () => {
      setLoadingLookup(true);
      try {
        const [dogRows, trainerList] = await Promise.all([
          fetchAllPages((pageIndex, batchSize) => dogService.getAll(pageIndex, batchSize, '')),
          userService.getAllByRole('TRAINER'),
        ]);
        if (!active) return;

        const dogList = Array.isArray(dogRows) ? dogRows : [];
        const trainerArr = Array.isArray(trainerList) ? trainerList : [];
        setDogs(dogList);
        setTrainers(trainerArr);

        // Fetch all active assignments to know which dogs/trainers are already assigned
        if (trainerArr.length > 0) {
          try {
            const responses = await Promise.all(
              trainerArr.map((trainer) =>
                dogAssignmentService.getByTrainer(trainer.userId).catch(() => ({ data: [] }))
              )
            );
            const allRows = responses.flatMap((response) => response?.data ?? response ?? []);
            const deduped = Array.from(
              new Map(allRows.filter((r) => r?.assignmentId).map((r) => [r.assignmentId, r])).values()
            );
            if (active) setActiveAssignments(deduped);
          } catch {
            // silent — assignments will just not be filtered
          }
        }
      } catch (error) {
        toast.error(error, { title: 'Không tải được danh mục chó/huấn luyện viên' });
      } finally {
        if (active) {
          setLoadingLookup(false);
        }
      }
    };

    fetchLookup();
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
        const response = await dogAssignmentService.getById(assignmentIdFromRoute);
        const detail = response?.data ?? response ?? {};
        if (!active) return;

        setFormData({
          dogId: detail.dogId ? String(detail.dogId) : '',
          trainerId: detail.trainerId ? String(detail.trainerId) : '',
          assignmentType: detail.assignmentType || 'PRIMARY',
          startDate: detail.startDate || getTodayDateValue(),
          endDate: detail.endDate || '',
          notes: detail.notes || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết phân công' });
        navigate('/assignments');
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
  }, [assignmentIdFromRoute, isEditMode, navigate, toast]);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAssignmentTypeChange = (value) => {
    const normalizedType = String(value || 'PRIMARY').toUpperCase();
    setFormData((prev) => ({
      ...prev,
      assignmentType: normalizedType,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateDogAssignmentForm(formData);
    if (validationErrors.length > 0) {
      toast.error({
        title: 'Thông tin phân công chưa hợp lệ',
        description: validationErrors,
      });
      return;
    }

    if (!selectedTrainer || String(selectedTrainer?.role || '').toUpperCase() !== 'TRAINER') {
      toast.error('Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên');
      return;
    }

    if (!selectedTrainer.specialtyId) {
      toast.error('Huấn luyện viên phải được gán chuyên ngành trước khi phân công chó');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dogId: Number(formData.dogId),
        trainerId: Number(formData.trainerId),
        assignmentType: formData.assignmentType || 'PRIMARY',
        assignmentScope: isPrimaryAssignment ? 'FULL_TRAINING' : 'CARE_ONLY',
        coveredAssignmentId: null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        notes: formData.notes?.trim() || null,
      };

      if (assignmentIdFromRoute) {
        await dogAssignmentService.update(assignmentIdFromRoute, payload);
        toast.success('Cập nhật phân công thành công');
      } else {
        await dogAssignmentService.assign(payload);
        toast.success('Tạo phân công thành công');
      }
      navigate('/assignments');
    } catch (error) {
      const mapped = mapAssignmentErrorToToast(error, isEditMode ? 'update' : 'create');
      toast.error(mapped);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa phân công chó' : 'Tạo phân công chó'}
      description={
        isEditMode
          ? 'Cập nhật phân công chó cho huấn luyện viên'
          : 'Gán chó nghiệp vụ cho huấn luyện viên và tự khởi tạo chương trình huấn luyện'
      }
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Phân công chó', href: '/assignments' },
        { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' },
      ]}
      formId="assignment-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/assignments')}
      saving={saving || loadingLookup || loadingDetail}
      saveLabel={isEditMode ? 'Cập nhật phân công' : 'Phân công'}
      actionHint="Ngày bắt đầu được lấy tự động theo ngày tạo phân công."
    >
      {/* Warning banners when all dogs/trainers are assigned */}
      {!isEditMode && !loadingLookup && (allDogsAssigned || allTrainersAssigned) && (
        <div className="space-y-2 mb-1">
          {allTrainersAssigned && <WarningBanner message="Tất cả HLV đã được phân công" />}
          {allDogsAssigned && <WarningBanner message="Tất cả chó đã được phân công" />}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Chó nghiệp vụ" required>
          <FormSelect
            value={formData.dogId}
            onChange={(event) => updateField('dogId', event.target.value)}
            placeholder="Chọn chó..."
            options={availableDogOptions}
          />
        </FormField>
        <FormField label="Huấn luyện viên" required>
          <FormSelect
            value={formData.trainerId}
            onChange={(event) => updateField('trainerId', event.target.value)}
            placeholder="Chọn HLV..."
            options={availableTrainerOptions}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Chuyên ngành áp dụng">
          <FormInput value={selectedTrainer?.specialtyName || ''} readOnly placeholder="Tự động theo trainer" />
        </FormField>
        <FormField label="Loại phân công">
          <FormSelect
            value={formData.assignmentType}
            onChange={(event) => handleAssignmentTypeChange(event.target.value)}
            options={assignmentTypeOptions}
          />
        </FormField>
        <div />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Ngày bắt đầu" required>
          <FormInput type="date" value={formData.startDate} readOnly />
        </FormField>
        <FormField label="Ngày kết thúc">
          <FormInput
            type="date"
            value={formData.endDate}
            onChange={(event) => updateField('endDate', event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Ghi chú">
        <FormTextarea
          maxLength={255}
          rows={4}
          value={formData.notes}
          onChange={(event) => updateField('notes', event.target.value)}
          placeholder="Ghi chú thêm (không bắt buộc)..."
        />
      </FormField>
    </CreateFormPage>
  );
};

export default DogAssignmentsCreatePage;

