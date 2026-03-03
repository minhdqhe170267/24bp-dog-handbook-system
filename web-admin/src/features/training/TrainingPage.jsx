import { useState, useEffect } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  message,
  Popconfirm,
  Typography,
  Tag,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { trainingService } from '../../services/trainingService';
import { breedService } from '../../services/breedService';

const difficultyColors = {
  BASIC: 'green',
  INTERMEDIATE: 'orange',
  ADVANCED: 'red',
};

const TrainingPage = () => {
  return (
    <div>
      <Typography.Title level={3}>Quản lý Huấn luyện</Typography.Title>
      <Tabs
        defaultActiveKey="1"
        items={[
          { key: '1', label: 'Phương pháp', children: <MethodsTab /> },
          { key: '2', label: 'Bài tập', children: <ExercisesTab /> },
          { key: '3', label: 'Lộ trình', children: <RoadmapsTab /> },
        ]}
      />
    </div>
  );
};

/* ─── Tab 1: Phương pháp huấn luyện ─── */
const MethodsTab = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await trainingService.getMethods(page, size);
      setMethods(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements }));
    } catch (err) {
      message.error('Lỗi tải danh sách phương pháp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current - 1, pagination.pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await trainingService.updateMethod(editing.methodId || editing.id, values);
        message.success('Cập nhật thành công');
      } else {
        await trainingService.createMethod(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (record) => {
    try {
      await trainingService.deleteMethod(record.methodId || record.id);
      message.success('Xóa thành công');
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'methodId', width: 60, render: (v, r) => v || r.id },
    { title: 'Tên phương pháp', dataIndex: 'methodName' },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      render: (v) => v && v.length > 100 ? v.substring(0, 100) + '...' : v,
    },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          Thêm mới
        </Button>
      </div>
      <Table columns={columns} dataSource={methods} loading={loading} rowKey={(r) => r.methodId || r.id}
        pagination={{ ...pagination, onChange: (page, size) => { setPagination((prev) => ({ ...prev, current: page, pageSize: size })); fetchData(page - 1, size); } }}
      />
      <Modal title={editing ? 'Sửa phương pháp' : 'Thêm phương pháp'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} okText={editing ? 'Cập nhật' : 'Tạo mới'} cancelText="Hủy">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="methodName" label="Tên phương pháp" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Huấn luyện tích cực" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="advantages" label="Ưu điểm">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="disadvantages" label="Nhược điểm">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/* ─── Tab 2: Bài tập ─── */
const ExercisesTab = () => {
  const [exercises, setExercises] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const [exRes, methRes] = await Promise.all([
        trainingService.getExercises(page, size),
        trainingService.getMethods(0, 100),
      ]);
      setExercises(exRes.data.content || []);
      setPagination((prev) => ({ ...prev, total: exRes.data.totalElements }));
      setMethods(methRes.data.content || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current - 1, pagination.pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await trainingService.updateExercise(editing.exerciseId || editing.id, values);
        message.success('Cập nhật thành công');
      } else {
        await trainingService.createExercise(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (record) => {
    try {
      await trainingService.deleteExercise(record.exerciseId || record.id);
      message.success('Xóa thành công');
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'exerciseId', width: 60, render: (v, r) => v || r.id },
    { title: 'Tên bài tập', dataIndex: 'exerciseName' },
    {
      title: 'Độ khó',
      dataIndex: 'difficultyLevel',
      render: (v) => v && <Tag color={difficultyColors[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Thời gian (phút)', dataIndex: 'durationMinutes', width: 130 },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          Thêm mới
        </Button>
      </div>
      <Table columns={columns} dataSource={exercises} loading={loading} rowKey={(r) => r.exerciseId || r.id}
        pagination={{ ...pagination, onChange: (page, size) => { setPagination((prev) => ({ ...prev, current: page, pageSize: size })); fetchData(page - 1, size); } }}
      />
      <Modal title={editing ? 'Sửa bài tập' : 'Thêm bài tập'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} okText={editing ? 'Cập nhật' : 'Tạo mới'} cancelText="Hủy">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="exerciseName" label="Tên bài tập" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Ngồi theo lệnh" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="difficultyLevel" label="Độ khó">
                <Select placeholder="Chọn" options={[
                  { value: 'BASIC', label: 'Cơ bản' },
                  { value: 'INTERMEDIATE', label: 'Trung bình' },
                  { value: 'ADVANCED', label: 'Nâng cao' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="methodId" label="Phương pháp">
                <Select placeholder="Chọn phương pháp" allowClear
                  options={methods.map((m) => ({ value: m.methodId || m.id, label: m.methodName }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="durationMinutes" label="Thời gian (phút)">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="instructions" label="Hướng dẫn">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="safetyPrecautions" label="Lưu ý an toàn">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="requiredEquipment" label="Thiết bị cần thiết">
            <Input placeholder="VD: Dây xích, bánh thưởng" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/* ─── Tab 3: Lộ trình ─── */
const RoadmapsTab = () => {
  const [roadmaps, setRoadmaps] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const [rmRes, brRes] = await Promise.all([
        trainingService.getRoadmaps(page, size),
        breedService.getAll(0, 100),
      ]);
      setRoadmaps(rmRes.data.content || []);
      setPagination((prev) => ({ ...prev, total: rmRes.data.totalElements }));
      setBreeds(brRes.data?.content || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current - 1, pagination.pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await trainingService.updateRoadmap(editing.roadmapId || editing.id, values);
        message.success('Cập nhật thành công');
      } else {
        await trainingService.createRoadmap(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (record) => {
    try {
      await trainingService.deleteRoadmap(record.roadmapId || record.id);
      message.success('Xóa thành công');
      fetchData(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'roadmapId', width: 60, render: (v, r) => v || r.id },
    { title: 'Tên lộ trình', dataIndex: 'roadmapName' },
    { title: 'Giống chó', dataIndex: 'breedName', render: (v) => v || '—' },
    { title: 'Vai trò mục tiêu', dataIndex: 'targetRole' },
    { title: 'Tổng tuần', dataIndex: 'totalDurationWeeks', width: 100 },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
          Thêm mới
        </Button>
      </div>
      <Table columns={columns} dataSource={roadmaps} loading={loading} rowKey={(r) => r.roadmapId || r.id}
        pagination={{ ...pagination, onChange: (page, size) => { setPagination((prev) => ({ ...prev, current: page, pageSize: size })); fetchData(page - 1, size); } }}
      />
      <Modal title={editing ? 'Sửa lộ trình' : 'Thêm lộ trình'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} okText={editing ? 'Cập nhật' : 'Tạo mới'} cancelText="Hủy">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="roadmapName" label="Tên lộ trình" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: Lộ trình tuần tra cơ bản" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="breedId" label="Giống chó">
                <Select placeholder="Chọn giống chó" allowClear showSearch optionFilterProp="label"
                  options={breeds.map((b) => ({ value: b.breedId, label: b.breedName }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="targetRole" label="Vai trò mục tiêu">
                <Input placeholder="VD: Tuần tra, Cứu hộ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="totalDurationWeeks" label="Tổng thời gian (tuần)">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Typography.Title level={5}>Thông tin giai đoạn</Typography.Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="phaseName" label="Tên giai đoạn">
                <Input placeholder="VD: Giai đoạn 1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phaseOrder" label="Thứ tự">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phaseDurationWeeks" label="Thời gian (tuần)">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="phaseObjectives" label="Mục tiêu giai đoạn">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="assessmentCriteria" label="Tiêu chí đánh giá">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TrainingPage;
