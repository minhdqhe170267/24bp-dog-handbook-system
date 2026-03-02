import { useState, useEffect } from 'react';
import {
  Tabs,
  Table,
  Tag,
  Select,
  Checkbox,
  Button,
  InputNumber,
  Alert,
  Progress,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Spin,
  message,
  Divider,
} from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { symptomService } from '../../services/symptomService';
import { breedService } from '../../services/breedService';

const categories = ['EATING', 'BEHAVIOR', 'PHYSICAL', 'RESPIRATORY', 'SKIN', 'OTHER'];

const categoryLabels = {
  EATING: 'Ăn uống',
  BEHAVIOR: 'Hành vi',
  PHYSICAL: 'Thể chất',
  RESPIRATORY: 'Hô hấp',
  SKIN: 'Da',
  OTHER: 'Khác',
};

const urgencyConfig = {
  EMERGENCY: { type: 'error', label: '🚨 KHẨN CẤP' },
  HIGH: { type: 'warning', label: '⚠️ CAO' },
  MEDIUM: { type: 'info', label: 'ℹ️ TRUNG BÌNH' },
  LOW: { type: 'success', label: '✅ THẤP' },
};

const MedicalPage = () => {
  return (
    <div>
      <Typography.Title level={3}>Quản lý Y tế</Typography.Title>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Danh sách triệu chứng',
            children: <SymptomListTab />,
          },
          {
            key: '2',
            label: '⭐ Kiểm tra triệu chứng',
            children: <SymptomCheckerTab />,
          },
        ]}
      />
    </div>
  );
};

/* ─── Tab 1: Danh sách triệu chứng ─── */
const SymptomListTab = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);

  const fetchSymptoms = async () => {
    setLoading(true);
    try {
      const res = await symptomService.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.content || [];
      setSymptoms(data);
    } catch (err) {
      console.error('Fetch error:', err);
      message.error('Lỗi tải danh sách triệu chứng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const filteredSymptoms = filterCategory
    ? symptoms.filter((s) => s.category === filterCategory)
    : symptoms;

  const columns = [
    { title: 'ID', dataIndex: 'symptomId', width: 60 },
    { title: 'Mã', dataIndex: 'symptomCode', width: 100 },
    { title: 'Tên triệu chứng', dataIndex: 'symptomName' },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      render: (v) => v && <Tag color="blue">{categoryLabels[v] || v}</Tag>,
    },
    {
      title: 'Mức độ',
      dataIndex: 'severityIndicator',
      render: (v) => v && <Tag color={v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green'}>{v}</Tag>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Text strong>Lọc theo danh mục:</Typography.Text>
        <Select
          placeholder="Tất cả"
          allowClear
          style={{ width: 200 }}
          onChange={(val) => setFilterCategory(val)}
          options={categories.map((c) => ({ value: c, label: categoryLabels[c] || c }))}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={filteredSymptoms}
        loading={loading}
        rowKey="symptomId"
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};

/* ─── Tab 2: Kiểm tra triệu chứng ⭐ ─── */
const SymptomCheckerTab = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [breedId, setBreedId] = useState(null);
  const [ageMonths, setAgeMonths] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [symptomRes, breedRes] = await Promise.all([
          symptomService.getAll(),
          breedService.getAll(0, 100),
        ]);
        const symptomData = Array.isArray(symptomRes.data) ? symptomRes.data : symptomRes.data?.content || [];
        setSymptoms(symptomData);
        setBreeds(breedRes.data?.content || []);
      } catch (err) {
        message.error('Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Group symptoms by category
  const groupedSymptoms = categories.reduce((acc, cat) => {
    const items = symptoms.filter((s) => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const handleCheck = async () => {
    if (selectedSymptoms.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 triệu chứng');
      return;
    }
    setCheckLoading(true);
    setResult(null);
    try {
      const payload = {
        symptomIds: selectedSymptoms,
        ...(breedId && { breedId }),
        ...(ageMonths && { ageMonths }),
      };
      const res = await symptomService.check(payload);
      setResult(res.data);
    } catch (err) {
      message.error('Lỗi kiểm tra triệu chứng');
    } finally {
      setCheckLoading(false);
    }
  };

  const resultColumns = [
    { title: 'Tên bệnh', dataIndex: 'diseaseName', width: 180 },
    {
      title: '% Khớp',
      dataIndex: 'matchPercentage',
      width: 150,
      render: (v) => (
        <Progress
          percent={Math.round(v)}
          size="small"
          status={v >= 70 ? 'exception' : 'active'}
          strokeColor={v >= 70 ? '#ff4d4f' : undefined}
        />
      ),
    },
    {
      title: 'Triệu chứng khớp',
      dataIndex: 'matchedSymptoms',
      render: (v) =>
        v && v.length > 0
          ? v.map((s, i) => <Tag key={i} color="green">{s}</Tag>)
          : '—',
    },
    {
      title: 'Triệu chứng thiếu',
      dataIndex: 'missingSymptomNames',
      render: (v) =>
        v && v.length > 0
          ? v.map((s, i) => <Tag key={i} color="orange">{s}</Tag>)
          : '—',
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;

  return (
    <div>
      <Card title="Chọn triệu chứng" style={{ marginBottom: 16 }}>
        {Object.entries(groupedSymptoms).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {categoryLabels[cat] || cat}
            </Typography.Text>
            <Checkbox.Group
              value={selectedSymptoms}
              onChange={(checkedValues) => {
                // Merge with other categories
                const otherCatIds = selectedSymptoms.filter(
                  (id) => !items.some((item) => item.symptomId === id)
                );
                setSelectedSymptoms([...otherCatIds, ...checkedValues]);
              }}
              options={items.map((s) => ({ label: s.symptomName, value: s.symptomId }))}
            />
            <Divider style={{ margin: '8px 0' }} />
          </div>
        ))}

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Typography.Text>Giống chó (tùy chọn):</Typography.Text>
            <Select
              placeholder="Chọn giống chó"
              allowClear
              style={{ width: '100%', marginTop: 4 }}
              onChange={setBreedId}
              showSearch
              optionFilterProp="label"
              options={breeds.map((b) => ({ value: b.breedId, label: b.breedName }))}
            />
          </Col>
          <Col span={8}>
            <Typography.Text>Tuổi (tháng, tùy chọn):</Typography.Text>
            <InputNumber
              placeholder="VD: 24"
              style={{ width: '100%', marginTop: 4 }}
              min={0}
              onChange={setAgeMonths}
            />
          </Col>
          <Col span={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="large"
              loading={checkLoading}
              onClick={handleCheck}
              style={{ width: '100%' }}
            >
              Kiểm tra
            </Button>
          </Col>
        </Row>
      </Card>

      {result && (
        <div>
          <Alert
            type={urgencyConfig[result.urgencyLevel]?.type || 'info'}
            message={`Mức độ khẩn cấp: ${urgencyConfig[result.urgencyLevel]?.label || result.urgencyLevel}`}
            description={result.recommendation}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Typography.Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            Tổng triệu chứng kiểm tra: {result.totalSymptomsChecked}
          </Typography.Text>

          <Table
            columns={resultColumns}
            dataSource={result.possibleDiseases || []}
            rowKey="diseaseId"
            pagination={false}
            rowClassName={(record) =>
              record.matchPercentage >= 70 ? 'highlight-row-danger' : ''
            }
          />
          <style>{`
            .highlight-row-danger {
              background-color: #fff1f0 !important;
            }
            .highlight-row-danger:hover > td {
              background-color: #ffccc7 !important;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default MedicalPage;
