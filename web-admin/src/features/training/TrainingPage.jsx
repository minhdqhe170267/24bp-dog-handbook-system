import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import { Modal, FormField, FormInput, FormTextarea, FormSelect, FormNumberInput, Button, ConfirmDialog, StatusBadge } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { trainingService } from '../../services/trainingService';
import { breedService } from '../../services/breedService';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../utils/utils';

const TrainingPage = () => {
  const [activeTab, setActiveTab] = useState('methods');
  const tabs = [
    { key: 'methods', label: 'Phương pháp' },
    { key: 'exercises', label: 'Bài tập' },
    { key: 'roadmaps', label: 'Lộ trình' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Quản lý Huấn luyện" description="Phương pháp, bài tập và lộ trình huấn luyện"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Huấn luyện' }]} />
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px cursor-pointer bg-transparent',
              activeTab === tab.key ? 'border-b-accent text-accent' : 'border-b-transparent text-muted-foreground hover:text-foreground'
            )}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'methods' && <MethodsTab />}
      {activeTab === 'exercises' && <ExercisesTab />}
      {activeTab === 'roadmaps' && <RoadmapsTab />}
    </div>
  );
};

// --- Methods Tab ---
const MethodsTab = () => {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [formData, setFormData] = useState({});

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try { const res = await trainingService.getMethods(page, size); setData(res.data.content || []); setPagination((prev) => ({ ...prev, total: res.data.totalElements, page })); }
    catch (err) { toast.error(err, { title: 'Không thể tải dữ liệu phương pháp huấn luyện' }); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(0, pagination.pageSize); }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await trainingService.updateMethod(editing.methodId || editing.id, formData); toast.success('Cập nhật thành công'); }
      else { await trainingService.createMethod(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null); fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err, { title: 'Không thể lưu phương pháp huấn luyện' }); }
  };
  const handleDelete = async () => {
    if (!deleteItem) return;
    try { await trainingService.deleteMethod(deleteItem.methodId || deleteItem.id); toast.success('Xóa thành công'); setDeleteItem(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error(err, { title: 'Không thể xóa phương pháp huấn luyện' }); }
  };
  const openEdit = (r) => { setEditing(r); setFormData({ ...r }); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'methodName', header: 'Tên phương pháp', render: (r) => <span className="font-medium text-foreground">{r.methodName}</span> },
    { key: 'description', header: 'Mô tả', render: (r) => r.description?.length > 100 ? r.description.substring(0, 100) + '...' : r.description },
    {
      key: 'actions', header: 'Thao tác', className: 'w-28', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4"><Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo phương pháp</Button></div>
      <DataTable columns={columns} data={data} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa phương pháp' : 'Thêm phương pháp'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên" required><FormInput maxLength={200} value={formData.methodName || ''} onChange={(e) => updateField('methodName', e.target.value)} /></FormField>
          <FormField label="Mô tả"><FormTextarea maxLength={255} rows={3} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Ưu điểm"><FormTextarea maxLength={255} rows={2} value={formData.advantages || ''} onChange={(e) => updateField('advantages', e.target.value)} /></FormField>
          <FormField label="Nhược điểm"><FormTextarea maxLength={255} rows={2} value={formData.disadvantages || ''} onChange={(e) => updateField('disadvantages', e.target.value)} /></FormField>
          <FormField label="Hướng dẫn"><FormTextarea maxLength={255} rows={3} value={formData.instructions || ''} onChange={(e) => updateField('instructions', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Xóa" description="Bạn có chắc chắn?" onConfirm={handleDelete} confirmLabel="Xóa" />
    </div>
  );
};

// --- Exercises Tab ---
const ExercisesTab = () => {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [formData, setFormData] = useState({});

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const [exRes, methRes] = await Promise.all([trainingService.getExercises(page, size), trainingService.getMethods(0, 100)]);
      setData(exRes.data.content || []); setMethods(methRes.data.content || []);
      setPagination((prev) => ({ ...prev, total: exRes.data.totalElements, page }));
    } catch (err) { toast.error(err, { title: 'Không thể tải dữ liệu bài tập huấn luyện' }); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(0, pagination.pageSize); }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await trainingService.updateExercise(editing.exerciseId || editing.id, formData); toast.success('Cập nhật thành công'); }
      else { await trainingService.createExercise(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null); fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err, { title: 'Không thể lưu bài tập huấn luyện' }); }
  };
  const handleDelete = async () => {
    if (!deleteItem) return;
    try { await trainingService.deleteExercise(deleteItem.exerciseId || deleteItem.id); toast.success('Xóa thành công'); setDeleteItem(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error(err, { title: 'Không thể xóa bài tập huấn luyện' }); }
  };
  const openEdit = (r) => { setEditing(r); setFormData({ ...r }); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'exerciseName', header: 'Tên bài tập', render: (r) => <span className="font-medium text-foreground">{r.exerciseName}</span> },
    { key: 'difficultyLevel', header: 'Độ khó', render: (r) => r.difficultyLevel ? <StatusBadge status={r.difficultyLevel} /> : '—' },
    { key: 'durationMinutes', header: 'Thời gian (phút)', className: 'w-32' },
    {
      key: 'actions', header: 'Thao tác', className: 'w-28', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4"><Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo bài tập</Button></div>
      <DataTable columns={columns} data={data} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa bài tập' : 'Thêm bài tập'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên bài tập" required><FormInput maxLength={200} value={formData.exerciseName || ''} onChange={(e) => updateField('exerciseName', e.target.value)} /></FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Độ khó" required>
              <FormSelect value={formData.difficultyLevel || ''} onChange={(e) => updateField('difficultyLevel', e.target.value)} placeholder="Chọn"
                options={[{ value: 'BASIC', label: 'Cơ bản' }, { value: 'INTERMEDIATE', label: 'TB' }, { value: 'ADVANCED', label: 'Nâng cao' }]} />
            </FormField>
            <FormField label="Phương pháp">
              <FormSelect value={formData.methodId || ''} onChange={(e) => updateField('methodId', e.target.value)} placeholder="Chọn"
                options={methods.map((m) => ({ value: m.methodId || m.id, label: m.methodName }))} />
            </FormField>
            <FormField label="Thời gian (phút)"><FormNumberInput value={formData.durationMinutes || ''} onChange={(e) => updateField('durationMinutes', e.target.value)} min={1} max={480} /></FormField>
          </div>
          <FormField label="Mô tả"><FormTextarea maxLength={255} rows={2} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Hướng dẫn"><FormTextarea maxLength={255} rows={3} value={formData.instructions || ''} onChange={(e) => updateField('instructions', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Xóa" description="Bạn có chắc chắn?" onConfirm={handleDelete} confirmLabel="Xóa" />
    </div>
  );
};

// --- Roadmaps Tab ---
const RoadmapsTab = () => {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [formData, setFormData] = useState({});

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const [rmRes, brRes] = await Promise.all([trainingService.getRoadmaps(page, size), breedService.getAll(0, 100)]);
      setData(rmRes.data.content || []); setBreeds(brRes.data?.content || []);
      setPagination((prev) => ({ ...prev, total: rmRes.data.totalElements, page }));
    } catch (err) { toast.error(err, { title: 'Không thể tải dữ liệu lộ trình huấn luyện' }); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(0, pagination.pageSize); }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await trainingService.updateRoadmap(editing.roadmapId || editing.id, formData); toast.success('Cập nhật thành công'); }
      else { await trainingService.createRoadmap(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null); fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err, { title: 'Không thể lưu lộ trình huấn luyện' }); }
  };
  const handleDelete = async () => {
    if (!deleteItem) return;
    try { await trainingService.deleteRoadmap(deleteItem.roadmapId || deleteItem.id); toast.success('Xóa thành công'); setDeleteItem(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error(err, { title: 'Không thể xóa lộ trình huấn luyện' }); }
  };
  const openEdit = (r) => { setEditing(r); setFormData({ ...r }); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'roadmapName', header: 'Tên lộ trình', render: (r) => <span className="font-medium text-foreground">{r.roadmapName}</span> },
    { key: 'breedName', header: 'Giống chó', render: (r) => r.breedName || '—' },
    { key: 'targetRole', header: 'Vai trò mục tiêu' },
    { key: 'totalDurationWeeks', header: 'Tổng tuần', className: 'w-24' },
    {
      key: 'actions', header: 'Thao tác', className: 'w-28', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4"><Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo lộ trình</Button></div>
      <DataTable columns={columns} data={data} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa lộ trình' : 'Thêm lộ trình'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên lộ trình" required><FormInput maxLength={200} value={formData.roadmapName || ''} onChange={(e) => updateField('roadmapName', e.target.value)} /></FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Giống chó">
              <FormSelect value={formData.breedId || ''} onChange={(e) => updateField('breedId', e.target.value)} placeholder="Chọn"
                options={breeds.map((b) => ({ value: b.breedId, label: b.breedName }))} />
            </FormField>
            <FormField label="Vai trò mục tiêu"><FormInput maxLength={100} value={formData.targetRole || ''} onChange={(e) => updateField('targetRole', e.target.value)} /></FormField>
            <FormField label="Tổng tuần"><FormNumberInput value={formData.totalDurationWeeks || ''} onChange={(e) => updateField('totalDurationWeeks', e.target.value)} min={1} max={104} /></FormField>
          </div>
          <FormField label="Mô tả"><FormTextarea maxLength={255} rows={2} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Xóa" description="Bạn có chắc chắn?" onConfirm={handleDelete} confirmLabel="Xóa" />
    </div>
  );
};

export default TrainingPage;

