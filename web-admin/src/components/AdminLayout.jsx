import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import {
  DashboardOutlined,
  BugOutlined,
  MedicineBoxOutlined,
  BookOutlined,
  ExperimentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/breeds', icon: <BookOutlined />, label: 'Giống chó' },
    { key: '/diseases', icon: <BugOutlined />, label: 'Bệnh' },
    { key: '/medications', icon: <MedicineBoxOutlined />, label: 'Thuốc' },
    { key: '/nutrition', icon: <ExperimentOutlined />, label: 'Dinh dưỡng' },
    { key: '/training', icon: <BookOutlined />, label: 'Huấn luyện' },
  ];

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Hồ sơ',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: () => {
          logout();
          navigate('/login');
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#fff',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography.Title
            level={4}
            style={{ color: '#fff', margin: 0, fontSize: collapsed ? 14 : 18 }}
          >
            {collapsed ? '24BP' : '24BP doghandbook'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined
              onClick={() => setCollapsed(false)}
              style={{ fontSize: 18, cursor: 'pointer' }}
            />
          ) : (
            <MenuFoldOutlined
              onClick={() => setCollapsed(true)}
              style={{ fontSize: 18, cursor: 'pointer' }}
            />
          )}
          <Dropdown menu={userMenu} placement="bottomRight">
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Avatar icon={<UserOutlined />} />
              <span>{user?.fullName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
