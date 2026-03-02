import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  message,
  Popconfirm,
  Typography,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { diseaseService } from '../../services/diseaseService';

const severityColors = {
  MILD: 'green',
  MODERATE: 'orange',
  SEVERE: 'red',
  CRITICAL: '#8B0000',
};

const DiseasesPage = () => {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchDiseases = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await diseaseService.getAll(page, size, search);
      setDiseases(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements }));
    } catch (err) {
      console.error('Fetch error:', err);
      message.error('Lỗi tải danh sách bệnh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiseases(pagination.current - 1, pagination.pageSize);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editingDisease) {
        await diseaseService.update(editingDisease.diseaseId, values);
        message.success('Cập nhật thành công');
      } else {
        await diseaseService.create(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingDisease(null);
      fetchDiseases(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await diseaseService.delete(id);
      message.success('Xóa thành công');
      fetchDiseases(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const openEdit = (record) => {
    setEditingDisease(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingDisease(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: 'ID', dataIndex: 'diseaseId', width: 60 },
    { title: 'Tên bệnh', dataIndex: 'diseaseName', sorter: true },
    {
      title: 'Mức độ nghiêm trọng',
      dataIndex: 'severityLevel',
      render: (v) =>
        v && (
          <Tag color={severityColors[v] || 'default'}>
            {v}
          </Tag>
        ),
    },
    {
      title: 'Lây nhiễm',
      dataIndex: 'isContagious',
      width: 100,
      render: (v) => (v ? <Tag color="red">Có</Tag> : <Tag color="green">Không</Tag>),
    },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa?"
            onConfirm={() => handleDelete(record.diseaseId)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={3}>Quản lý Bệnh</Typography.Title>
        <Space>
          <Input.Search
            placeholder="Tìm kiếm..."
            onSearch={setSearch}
            style={{ width: 300 }}
            allowClear
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={diseases}
        loading={loading}
        rowKey="diseaseId"
        pagination={{
          ...pagination,
          onChange: (page, size) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize: size }));
            fetchDiseases(page - 1, size);
          },
        }}
      />

      <Modal
        title={editingDisease ? 'Sửa bệnh' : 'Thêm bệnh mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        okText={editingDisease ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="diseaseName"
            label="Tên bệnh"
            rules={[{ required: true, message: 'Vui lòng nhập tên bệnh' }]}
          >
            <Input placeholder="VD: Parvo" />
          </Form.Item>

          <Form.Item name="severityLevel" label="Mức độ nghiêm trọng">
            <Select
              placeholder="Chọn mức độ"
              options={[
                { value: 'MILD', label: 'Nhẹ (Mild)' },
                { value: 'MODERATE', label: 'Trung bình (Moderate)' },
                { value: 'SEVERE', label: 'Nặng (Severe)' },
                { value: 'CRITICAL', label: 'Nguy kịch (Critical)' },
              ]}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết về bệnh" />
          </Form.Item>

          <Form.Item name="commonSymptoms" label="Triệu chứng thường gặp">
            <Input.TextArea rows={2} placeholder="VD: Sốt, nôn mửa, tiêu chảy" />
          </Form.Item>

          <Form.Item name="treatment" label="Phương pháp điều trị">
            <Input.TextArea rows={2} placeholder="Phương pháp điều trị" />
          </Form.Item>

          <Form.Item name="preventionMethods" label="Phương pháp phòng ngừa">
            <Input.TextArea rows={2} placeholder="Phương pháp phòng ngừa" />
          </Form.Item>

          <Form.Item
            name="isContagious"
            label="Lây nhiễm"
            valuePropName="checked"
          >
            <Switch checkedChildren="Có" unCheckedChildren="Không" />
          </Form.Item>

          <Form.Item name="incubationPeriod" label="Thời gian ủ bệnh">
            <Input placeholder="VD: 3-7 ngày" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiseasesPage;
