import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  Typography,
  Descriptions,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { medicationService } from '../../services/medicationService';

const MedicationsPage = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editingMedication, setEditingMedication] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchMedications = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await medicationService.getAll(page, size, search);
      setMedications(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements }));
    } catch (err) {
      console.error('Fetch error:', err);
      message.error('Lỗi tải danh sách thuốc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications(pagination.current - 1, pagination.pageSize);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values) => {
    try {
      if (editingMedication) {
        await medicationService.update(editingMedication.medicationId, values);
        message.success('Cập nhật thành công');
      } else {
        await medicationService.create(values);
        message.success('Tạo mới thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingMedication(null);
      fetchMedications(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await medicationService.delete(id);
      message.success('Xóa thành công');
      fetchMedications(pagination.current - 1, pagination.pageSize);
    } catch (err) {
      message.error('Lỗi khi xóa');
    }
  };

  const openEdit = (record) => {
    setEditingMedication(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingMedication(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openDetail = async (record) => {
    try {
      const res = await medicationService.getById(record.medicationId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) {
      message.error('Lỗi tải chi tiết thuốc');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'medicationId', width: 60 },
    { title: 'Tên thuốc', dataIndex: 'medicationName', sorter: true },
    { title: 'Phương pháp dùng', dataIndex: 'administrationMethod' },
    {
      title: 'Hành động',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa?"
            onConfirm={() => handleDelete(record.medicationId)}
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
        <Typography.Title level={3}>Quản lý Thuốc</Typography.Title>
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
        dataSource={medications}
        loading={loading}
        rowKey="medicationId"
        pagination={{
          ...pagination,
          onChange: (page, size) => {
            setPagination((prev) => ({ ...prev, current: page, pageSize: size }));
            fetchMedications(page - 1, size);
          },
        }}
      />

      {/* Modal Chi tiết thuốc */}
      <Modal
        title="Chi tiết thuốc"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detailData && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Tên thuốc">{detailData.medicationName}</Descriptions.Item>
            <Descriptions.Item label="Mô tả">{detailData.description || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hướng dẫn liều dùng">{detailData.dosageInstructions || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phương pháp dùng">{detailData.administrationMethod || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tác dụng phụ">{detailData.sideEffects || '—'}</Descriptions.Item>
            <Descriptions.Item label="Chống chỉ định">{detailData.contraindications || '—'}</Descriptions.Item>
            <Descriptions.Item label="Yêu cầu bảo quản">{detailData.storageRequirements || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hình ảnh">
              {detailData.imageUrl ? (
                <img src={detailData.imageUrl} alt={detailData.medicationName} style={{ maxWidth: 200 }} />
              ) : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal Thêm/Sửa thuốc */}
      <Modal
        title={editingMedication ? 'Sửa thuốc' : 'Thêm thuốc mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        okText={editingMedication ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="medicationName"
            label="Tên thuốc"
            rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}
          >
            <Input placeholder="VD: Amoxicillin" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết về thuốc" />
          </Form.Item>

          <Form.Item name="dosageInstructions" label="Hướng dẫn liều dùng">
            <Input.TextArea rows={2} placeholder="VD: 10mg/kg, 2 lần/ngày" />
          </Form.Item>

          <Form.Item name="administrationMethod" label="Phương pháp dùng">
            <Input placeholder="VD: Uống, Tiêm, Bôi ngoài da" />
          </Form.Item>

          <Form.Item name="sideEffects" label="Tác dụng phụ">
            <Input.TextArea rows={2} placeholder="Các tác dụng phụ có thể xảy ra" />
          </Form.Item>

          <Form.Item name="contraindications" label="Chống chỉ định">
            <Input.TextArea rows={2} placeholder="Các trường hợp chống chỉ định" />
          </Form.Item>

          <Form.Item name="storageRequirements" label="Yêu cầu bảo quản">
            <Input placeholder="VD: Bảo quản ở nhiệt độ phòng" />
          </Form.Item>

          <Form.Item name="imageUrl" label="URL hình ảnh">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MedicationsPage;
