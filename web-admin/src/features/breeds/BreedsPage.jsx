import { useState, useEffect } from 'react';
import {
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
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { breedService } from '../../services/breedService';

const BreedsPage = () => {
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchBreeds = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await breedService.getAll(page, size, search);
      console.log('API Response:', res); // Debug log
      console.log('Breeds data:', res.data); // Debug log
      setBreeds(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements }));
    } catch (err) {
      console.error('Fetch error:', err); // Debug log
      message.error('Lỗi tải danh sách giống chó');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreeds(pagination.current - 1, pagination.pageSize);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editingBreed) {
        await breedService.update(editingBreed.breedId, values);
        message.success('Cập nhật thành công');
      } else {
        await breedService.create(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingBreed(null);
      fetchBreeds(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await breedService.delete(id);
      message.success('Xóa thành công');
      fetchBreeds(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const openEdit = (record) => {
    setEditingBreed(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingBreed(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: 'ID', dataIndex: 'breedId', width: 60 },
    { title: 'Tên giống', dataIndex: 'breedName', sorter: true },
    { title: 'Xuất xứ', dataIndex: 'origin' },
    {
      title: 'Kích thước',
      dataIndex: 'sizeClassification',
      render: (v) => v && <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Khả năng huấn luyện',
      dataIndex: 'trainabilityLevel',
      render: (v) =>
        v && <Tag color={v === 'VERY_HIGH' ? 'green' : 'orange'}>{v}</Tag>,
    },
    {
      title: 'Hành động',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa?"
            onConfirm={() => handleDelete(record.breedId)}
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
        <Typography.Title level={3}>Quản lý Giống chó</Typography.Title>
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
        dataSource={breeds}
        loading={loading}
        rowKey="breedId"
        pagination={{
          ...pagination,
          onChange: (page, size) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize: size }));
            fetchBreeds(page - 1, size);
          },
        }}
      />

      <Modal
        title={editingBreed ? 'Sửa giống chó' : 'Thêm giống chó mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
        okText={editingBreed ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="breedName"
            label="Tên giống"
            rules={[{ required: true, message: 'Vui lòng nhập tên giống' }]}
          >
            <Input placeholder="VD: Becgie Đức" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="origin" label="Xuất xứ">
                <Input placeholder="VD: Đức" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lifespanYears" label="Tuổi thọ">
                <Input placeholder="VD: 10-13" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sizeClassification" label="Kích thước">
                <Select
                  placeholder="Chọn kích thước"
                  options={[
                    { value: 'SMALL', label: 'Nhỏ' },
                    { value: 'MEDIUM', label: 'Trung bình' },
                    { value: 'LARGE', label: 'Lớn' },
                    { value: 'GIANT', label: 'Khổng lồ' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trainabilityLevel" label="Khả năng huấn luyện">
                <Select
                  placeholder="Chọn mức độ"
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

          <Typography.Title level={5}>Cân nặng chuẩn (kg)</Typography.Title>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="weightMaleMinKg" label="Đực Min">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="weightMaleMaxKg" label="Đực Max">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="weightFemaleMinKg" label="Cái Min">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="weightFemaleMaxKg" label="Cái Max">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="avgHeightCm" label="Chiều cao trung bình (cm)">
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
          </Form.Item>

          <Form.Item name="operationalCapabilities" label="Khả năng tác chiến">
            <Input.TextArea
              rows={2}
              placeholder="VD: Tuần tra, phát hiện ma túy, tìm kiếm cứu nạn"
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết về giống chó" />
          </Form.Item>

          <Form.Item name="imageUrl" label="URL hình ảnh">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BreedsPage;
