import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogAssignmentService } from '../../services/dogAssignmentService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import { mapAssignmentErrorToToast } from './assignmentErrorMapper';

const assignmentTypeOptions = [
  { value: 'PRIMARY', label: 'Chính' },
  { value: 'TEMPORARY', label: 'Tạm thời' },
];

const defaultForm = {
  dogId: '',
  trainerId: '',
  assignmentType: 'PRIMARY',
  startDate: '',
  endDate: '',
  notes: '',
};

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
  const [formData, setFormData] = useState(defaultForm);
  const assignmentType = String(formData.assignmentType || 'PRIMARY').toUpperCase();
  const isPrimaryAssignment = assignmentType === 'PRIMARY';

  useEffect(() => {
    const fetchLookup = async () => {
      setLoadingLookup(true);
      try {
        const [dogsRes, trainerList] = await Promise.all([
          dogService.getAll(0, 200, ''),
          userService.getAllByRole('TRAINER'),
        ]);
        const dogList = dogsRes.data?.content || [];
        setDogs(dogList);
        setTrainers(trainerList || []);
      } catch (error) {
        toast.error(error, { title: 'Không tải được danh mục chó/huấn luyện viên' });
      } finally {
        setLoadingLookup(false);
      }
    };
    fetchLookup();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await dogAssignmentService.getById(assignmentIdFromRoute);
        const detail = res?.data || res || {};

        setFormData({
          dogId: detail.dogId ? String(detail.dogId) : '',
          trainerId: detail.trainerId ? String(detail.trainerId) : '',
          assignmentType: detail.assignmentType || 'PRIMARY',
          startDate: detail.startDate || '',
          endDate: detail.endDate || '',
          notes: detail.notes || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết phân công' });
        navigate('/assignments');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [assignmentIdFromRoute, isEditMode, navigate, toast]);

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleAssignmentTypeChange = (value) => {
    const normalizedType = String(value || 'PRIMARY').toUpperCase();
    setFormData((prev) => ({
      ...prev,
      assignmentType: normalizedType,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const missingFields = [];
    if (!formData.dogId) missingFields.push('Chó');
    if (!formData.trainerId) missingFields.push('Huấn luyện viên');
    if (!formData.startDate) missingFields.push('Ngày bắt đầu');

    if (missingFields.length > 0) {
      toast.error({
        title: 'Thiếu thông tin bắt buộc',
        description: `Vui lòng chọn/nhập: ${missingFields.join(', ')}.`,
      });
      return;
    }
    const selectedTrainer = trainers.find(
      (trainer) => String(trainer?.userId) === String(formData.trainerId),
    );
    if (!selectedTrainer || String(selectedTrainer?.role || '').toUpperCase() !== 'TRAINER') {
      toast.error('Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên');
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
      description={isEditMode ? 'Cập nhật phân công chó cho huấn luyện viên' : 'Gán chó nghiệp vụ cho huấn luyện viên'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Phân công chó', href: '/assignments' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="assignment-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/assignments')}
      saving={saving || loadingLookup || loadingDetail}
      saveLabel={isEditMode ? 'Cập nhật phân công' : 'Tạo phân công'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Chó" required>
          <FormSelect
            value={formData.dogId}
            onChange={(e) => updateField('dogId', e.target.value)}
            placeholder="Chọn chó"
            options={dogs.map((dog) => ({ value: dog.dogId, label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}` }))}
          />
        </FormField>
        <FormField label="Huấn luyện viên" required>
          <FormSelect
            value={formData.trainerId}
            onChange={(e) => updateField('trainerId', e.target.value)}
            placeholder="Chọn huấn luyện viên"
            options={trainers.map((trainer) => ({ value: trainer.userId, label: `${trainer.fullName} (${trainer.username})` }))}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Loại phân công">
          <FormSelect value={formData.assignmentType} onChange={(e) => handleAssignmentTypeChange(e.target.value)} options={assignmentTypeOptions} />
        </FormField>
        <FormField label="Ngày bắt đầu" required>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card"
          />
        </FormField>
        <FormField label="Ngày kết thúc">
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card"
          />
        </FormField>
      </div>
      <FormField label="Ghi chú">
        <FormTextarea rows={4} value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
      </FormField>
    </CreateFormPage>
  );
};

export default DogAssignmentsCreatePage;
