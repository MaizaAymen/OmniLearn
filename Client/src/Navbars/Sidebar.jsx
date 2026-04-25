import React, { useMemo, useState } from 'react';
import {
  BellOutlined,
  CodeOutlined,
  CompassOutlined,
  DeploymentUnitOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  ReadOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const getStoredUser = () => {
  try {
    const u = Cookies.get('user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

const ROLE_COLOR = {
  admin: 'red',
  teacher: 'blue',
  student: 'green',
};

// Which roles can see each sidebar key
const ROLE_MENU = {
  '/':              ['admin', 'teacher', 'student'],
  '/problems':      ['admin', 'teacher', 'student'],
  '/live-sessions': ['admin', 'teacher'],
  '/classroom-pdf': ['admin', 'teacher', 'student'],
  '/my-classrooms': ['admin', 'teacher', 'student'],
  '/pdf-assistant': ['admin', 'teacher', 'student'],
  '/roadmaps':      ['admin', 'teacher', 'student'],
  '/problem-roadmap': ['admin', 'teacher', 'student'],
  '/uml/problems':  ['admin', 'teacher', 'student'],
  '/users':         ['admin'],
  '/education':     ['admin', 'teacher'],
  '/auth':          ['anon'],
  '/profile':       ['admin', 'teacher', 'student'],
};

const Sidebar = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = getStoredUser();
  const role = storedUser?.role ?? null;
  const fullName = storedUser
    ? `${storedUser.firstname ?? ''} ${storedUser.lastname ?? ''}`.trim() || storedUser.email
    : 'Guest';
  const initials = storedUser
    ? `${storedUser.firstname?.[0] ?? ''}${storedUser.lastname?.[0] ?? ''}`.toUpperCase() || (storedUser.email?.[0] ?? '?').toUpperCase()
    : '?';
  const avatarSrc = storedUser?.id
    ? localStorage.getItem(`avatar_${storedUser.id}`)
    : null;

  const handleLogout = () => {
    Cookies.remove('user');
    Cookies.remove('token');
    if (storedUser?.id) localStorage.removeItem(`avatar_${storedUser.id}`);
    navigate('/auth');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const notificationMenuItems = [
    {
      key: 'empty',
      label: (
        <div style={{ padding: '12px 8px', textAlign: 'center', minWidth: 220 }}>
          <BellOutlined style={{ fontSize: 22, color: '#bfbfbf' }} />
          <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
            You're all caught up
          </div>
        </div>
      ),
      disabled: true,
    },
  ];

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const items = useMemo(
    () => [
      {
        key: '/problems',
        icon: <ProjectOutlined />,
        label: 'Problems',
      },
      {
        key: '/live-sessions',
        icon: <DeploymentUnitOutlined />,
        label: 'Live Sessions',
      },
      {
        key: '/classroom-pdf',
        icon: <ReadOutlined />,
        label: 'Classroom PDFs',
      },
      {
        key: '/my-classrooms',
        icon: <ReadOutlined />,
        label: 'My Classrooms',
      },
      {
        key: '/pdf-assistant',
        icon: <ReadOutlined />,
        label: 'PDF Assistant',
      },

      {
        key: '/uml/problems',
        icon: <ProjectOutlined />,
        label: 'UML Problems',
      },
      {
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Users',
      },
      {
        key: '/education',
        icon: <SettingOutlined />,
        label: 'education',
      },
      {
        key: '/auth',
        icon: <LoginOutlined />,
        label: 'Auth',
      },
      {
        key: '/profile',
        icon: <UserOutlined />,
        label: 'Profile',
      },
    ].filter((it) => {
      const allowed = ROLE_MENU[it.key] || [];
      if (!role) return allowed.includes('anon');
      return allowed.includes(role);
    }),
    [role]
  );

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/problems')) return '/problems';
    if (location.pathname.startsWith('/live-sessions')) return '/live-sessions';
    if (location.pathname.startsWith('/classroom-pdf')) return '/classroom-pdf';
    if (location.pathname.startsWith('/my-classrooms')) return '/my-classrooms';
    if (location.pathname.startsWith('/pdf-assistant')) return '/pdf-assistant';
    if (location.pathname.startsWith('/roadmaps')) return '/roadmaps';
    if (location.pathname.startsWith('/problem-roadmap')) return '/problem-roadmap';
    if (location.pathname.startsWith('/uml/problems')) return '/uml/problems';
    if (location.pathname.startsWith('/users')) return '/users';
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/auth')) return '/auth';
    if (location.pathname.startsWith('/profile')) return '/profile';
    return '/';
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px 0 0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
              color: '#595959',
            }}
          />

          <Space size={12} align="center">
            {role && (
              <Tag
                color={ROLE_COLOR[role] ?? 'default'}
                style={{
                  margin: 0,
                  borderRadius: 999,
                  padding: '2px 12px',
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {role}
              </Tag>
            )}

            <Dropdown
              menu={{ items: notificationMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Tooltip title="Notifications" placement="bottom">
                <Button
                  type="text"
                  shape="circle"
                  style={{
                    width: 40,
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#595959',
                  }}
                  icon={
                    <Badge dot offset={[-2, 2]} color="#ff4d4f">
                      <BellOutlined style={{ fontSize: 18 }} />
                    </Badge>
                  }
                />
              </Tooltip>
            </Dropdown>

            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '4px 10px 4px 4px',
                  borderRadius: 999,
                  border: '1px solid #f0f0f0',
                  background: '#fafafa',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fafafa')}
              >
                <Avatar
                  size={32}
                  src={avatarSrc || undefined}
                  style={{
                    backgroundColor: '#4f46e5',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {!avatarSrc && initials}
                </Avatar>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    lineHeight: 1.15,
                    maxWidth: 140,
                  }}
                >
                  <Text
                    strong
                    ellipsis
                    style={{ fontSize: 13, color: '#262626' }}
                  >
                    {fullName}
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, textTransform: 'capitalize' }}
                  >
                    {role || 'Guest'}
                  </Text>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
export default Sidebar;