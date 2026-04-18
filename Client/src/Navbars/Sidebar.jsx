import React, { useMemo, useState } from 'react';
import {
  CodeOutlined,
  CompassOutlined,
  DeploymentUnitOutlined,
  LoginOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  ReadOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const Sidebar = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const items = useMemo(
    () => [
      {
        key: '/',
        icon: <CodeOutlined />,
        label: 'Code Editor',
      },
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
        key: '/pdf-assistant',
        icon: <ReadOutlined />,
        label: 'PDF Assistant',
      },
      {
        key: '/roadmaps',
        icon: <CompassOutlined />,
        label: 'Roadmaps',
      },
      {
        key: '/problem-roadmap',
        icon: <CompassOutlined />,
        label: 'Problem Roadmap',
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
        key: '/admin',
        icon: <SettingOutlined />,
        label: 'Admin',
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
    ],
    []
  );

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/problems')) return '/problems';
    if (location.pathname.startsWith('/live-sessions')) return '/live-sessions';
    if (location.pathname.startsWith('/classroom-pdf')) return '/classroom-pdf';
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
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
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