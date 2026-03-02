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
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { nutritionService } from '../../services/nutritionService';
import { breedService } from '../../services/breedService';

const activityColors = {
  LOW: 'green',
  MEDIUM: 'blue',
  HIGH: 'orange',
  VERY_HIGH: 'red',
};

const weightStatusColors = {
  UNDERWEIGHT: 'orange',
  NORMAL: 'green',
  OVERWEIGHT: 'red',
};

const NutritionPage = () => {
  return (
    <div>
      <Typography.Title level={3}>Quản lý Dinh dưỡng</Typography.Title>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Tiêu chuẩn dinh dưỡng',
            children: <NutritionStandardsTab />,
          },
          {
            key: '2',
            label: '⭐ Tính khẩu phần',
            children: <NutritionCalculatorTab />,
          },
        ]}
      />
    </div>
  );
};

/* ─── Tab 1: Tiêu chuẩn dinh dưỡng CRUD ─── */
const NutritionStandardsTab = () => {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchStandards = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await nutritionService.getAll(page, size);
      setStandards(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements }));
    } catch (err) {
      message.error('Lỗi tải danh sách tiêu chuẩn dinh dưỡng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandards(pagination.current - 1, pagination.pageSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editingStandard) {
        await nutritionService.update(editingStandard.rationId || editingStandard.id, values);
        message.success('Cập nhật thành công');
      } else {
        await nutritionService.create(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingStandard(null);
      fetchStandards(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (record) => {
    try {
      await nutritionService.delete(record.rationId || record.id);
      message.success('Xóa thành công');
      fetchStandards(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const openEdit = (record) => {
    setEditingStandard(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingStandard(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: 'ID', dataIndex: 'rationId', width: 60, render: (v, r) => v || r.id },
    { title: 'Mã khẩu phần', dataIndex: 'rationCode', width: 130 },
    { title: 'Tên', dataIndex: 'rationName' },
    { title: 'Giống chó', dataIndex: 'breedName', render: (v) => v || '—' },
    {
      title: 'Mức hoạt động',
      dataIndex: 'activityLevel',
      render: (v) => v && <Tag color={activityColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={standards}
        loading={loading}
        rowKey={(r) => r.rationId || r.id}
        pagination={{
          ...pagination,
          onChange: (page, size) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize: size }));
            fetchStandards(page - 1, size);
          },
        }}
      />

      <Modal
        title={editingStandard ? 'Sửa tiêu chuẩn' : 'Thêm tiêu chuẩn mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        okText={editingStandard ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="rationCode" label="Mã khẩu phần" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Input placeholder="VD: NUT-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rationName" label="Tên khẩu phần" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Input placeholder="VD: Khẩu phần trưởng thành" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="breedId" label="Giống chó">
                <InputNumber style={{ width: '100%' }} placeholder="ID giống chó" min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activityLevel" label="Mức hoạt động">
                <Select
                  placeholder="Chọn mức hoạt động"
                  options={[
                    { value: 'LOW', label: 'Thấp' },
                    { value: 'MEDIUM', label: 'Trung bình' },
                    { value: 'HIGH', label: 'Cao' },
                    { value: 'VERY_HIGH', label: 'Rất cao' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetAgeMinMonths" label="Tuổi tối thiểu (tháng)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetAgeMaxMonths" label="Tuổi tối đa (tháng)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="healthCondition" label="Tình trạng sức khỏe">
            <Select
              placeholder="Chọn tình trạng"
              options={[
                { value: 'NORMAL', label: 'Bình thường' },
                { value: 'RECOVERY', label: 'Hồi phục' },
                { value: 'SPECIAL', label: 'Đặc biệt' },
              ]}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả tiêu chuẩn dinh dưỡng" />
          </Form.Item>

          <Form.Item name="specialNotes" label="Ghi chú đặc biệt">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/* ─── Tab 2: Tính khẩu phần ⭐ ─── */
const NutritionCalculatorTab = () => {
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const loadBreeds = async () => {
      setLoading(true);
      try {
        const res = await breedService.getAll(0, 100);
        setBreeds(res.data?.content || []);
      } catch (err) {
        message.error('Lỗi tải danh sách giống chó');
      } finally {
        setLoading(false);
      }
    };
    loadBreeds();
  }, []);

  const handleCalculate = async (values) => {
    setCalcLoading(true);
    setResult(null);
    try {
      const res = await nutritionService.calculate(values);
      setResult(res.data);
    } catch (err) {
      message.error('Lỗi tính khẩu phần');
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

  return (
    <div>
      <Card title="Nhập thông tin" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleCalculate}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="breedId" label="Giống chó" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Select
                  placeholder="Chọn giống chó"
                  showSearch
                  optionFilterProp="label"
                  options={breeds.map((b) => ({ value: b.breedId, label: b.breedName }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weightKg" label="Cân nặng (kg)" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <InputNumber style={{ width: '100%' }} min={0.1} step={0.5} placeholder="VD: 30" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ageMonths" label="Tuổi (tháng)" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="VD: 24" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Select
                  placeholder="Chọn giới tính"
                  options={[
                    { value: 'MALE', label: 'Đực' },
                    { value: 'FEMALE', label: 'Cái' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="activityLevel" label="Mức hoạt động" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Select
                  placeholder="Chọn mức hoạt động"
                  options={[
                    { value: 'LOW', label: 'Thấp' },
                    { value: 'MEDIUM', label: 'Trung bình' },
                    { value: 'HIGH', label: 'Cao' },
                    { value: 'VERY_HIGH', label: 'Rất cao' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Form.Item style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CalculatorOutlined />}
                  size="large"
                  loading={calcLoading}
                  style={{ width: '100%' }}
                >
                  Tính toán
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {result && (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="Calories/ngày" value={result.dailyCalories} suffix="kcal" valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Protein" value={result.proteinGrams} suffix="g" valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Chất béo" value={result.fatGrams} suffix="g" valueStyle={{ color: '#d4a017' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Carb" value={result.carbGrams} suffix="g" valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card>
                <Statistic title="Số bữa/ngày" value={result.mealsPerDay} suffix="bữa" />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="Khẩu phần/bữa" value={result.portionSizeGrams} suffix="g" />
              </Card>
            </Col>
          </Row>

          {result.breedName && (
            <Card title={`Giống chó: ${result.breedName}`} style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text>Trạng thái cân nặng:</Typography.Text>
                <Tag color={weightStatusColors[result.weightStatus] || 'default'} style={{ fontSize: 14 }}>
                  {result.weightStatus}
                </Tag>
              </Space>
            </Card>
          )}

          {result.recommendation && (
            <Card title="Khuyến nghị" style={{ marginBottom: 16 }}>
              <Typography.Paragraph>{result.recommendation}</Typography.Paragraph>
            </Card>
          )}

          {result.suggestedRation && (
            <Card title="Khẩu phần gợi ý" type="inner">
              <Typography.Text strong>{result.suggestedRation.rationCode} — {result.suggestedRation.rationName}</Typography.Text>
              <br />
              <Typography.Text type="secondary">{result.suggestedRation.description}</Typography.Text>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default NutritionPage;
