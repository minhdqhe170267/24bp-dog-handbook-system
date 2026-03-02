import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  BookOutlined,
  BugOutlined,
  MedicineBoxOutlined,
  UserOutlined,
} from '@ant-design/icons';

const DashboardPage = () => (
  <div>
    <Typography.Title level={2}>Dashboard</Typography.Title>
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="Giống chó"
            value={4}
            prefix={<BookOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Bệnh"
            value={6}
            prefix={<BugOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Thuốc"
            value={5}
            prefix={<MedicineBoxOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Người dùng"
            value={7}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  </div>
);

export default DashboardPage;
