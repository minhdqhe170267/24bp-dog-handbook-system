import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Button, Spin } from 'antd';
import {
  BookOutlined,
  BugOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  SearchOutlined,
  CalculatorOutlined,
  UnorderedListOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { breedService } from '../../services/breedService';
import { diseaseService } from '../../services/diseaseService';
import { medicationService } from '../../services/medicationService';
import { nutritionService } from '../../services/nutritionService';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    breeds: 0,
    diseases: 0,
    medications: 0,
    nutrition: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [breedRes, diseaseRes, medRes, nutRes] = await Promise.all([
          breedService.getAll(0, 1),
          diseaseService.getAll(0, 1),
          medicationService.getAll(0, 1),
          nutritionService.getAll(0, 1),
        ]);
        setStats({
          breeds: breedRes.data?.totalElements || 0,
          diseases: diseaseRes.data?.totalElements || 0,
          medications: medRes.data?.totalElements || 0,
          nutrition: nutRes.data?.totalElements || 0,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16 }}>
          Đang tải dữ liệu...
        </Typography.Text>
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={2}>Dashboard</Typography.Title>

      {/* Thống kê */}
      <Row gutter={16} style={{ marginBottom: 32 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/breeds')}>
            <Statistic
              title="Giống chó"
              value={stats.breeds}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/diseases')}>
            <Statistic
              title="Bệnh"
              value={stats.diseases}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/medications')}>
            <Statistic
              title="Thuốc"
              value={stats.medications}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/nutrition')}>
            <Statistic
              title="Dinh dưỡng"
              value={stats.nutrition}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#d4a017' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Truy cập nhanh */}
      <Typography.Title level={4}>Truy cập nhanh</Typography.Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card
            hoverable
            style={{ borderColor: '#ff4d4f', borderWidth: 2 }}
            onClick={() => navigate('/medical')}
          >
            <div style={{ textAlign: 'center' }}>
              <AlertOutlined style={{ fontSize: 32, color: '#ff4d4f', marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                ⭐ Kiểm tra triệu chứng
              </Typography.Title>
              <Typography.Text type="secondary">Chẩn đoán nhanh</Typography.Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/nutrition')}>
            <div style={{ textAlign: 'center' }}>
              <CalculatorOutlined style={{ fontSize: 32, color: '#d4a017', marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Tính khẩu phần
              </Typography.Title>
              <Typography.Text type="secondary">Dinh dưỡng tối ưu</Typography.Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/breeds')}>
            <div style={{ textAlign: 'center' }}>
              <UnorderedListOutlined style={{ fontSize: 32, color: '#3f8600', marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Quản lý giống chó
              </Typography.Title>
              <Typography.Text type="secondary">Danh sách giống</Typography.Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/diseases')}>
            <div style={{ textAlign: 'center' }}>
              <SearchOutlined style={{ fontSize: 32, color: '#cf1322', marginBottom: 8 }} />
              <Typography.Title level={5} style={{ margin: 0 }}>
                Quản lý bệnh
              </Typography.Title>
              <Typography.Text type="secondary">Tra cứu bệnh</Typography.Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
