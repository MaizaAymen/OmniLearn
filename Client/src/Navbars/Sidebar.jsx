import React, { useMemo, useState } from 'react';
import {
  CodeOutlined,
  CompassOutlined,
  LoginOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  TeamOutlined,
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
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Users',
      },
      {
        key: '/auth',
        icon: <LoginOutlined />,
        label: 'Auth',
      },
    ],
    []
  );

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/problems')) return '/problems';
    if (location.pathname.startsWith('/roadmaps')) return '/roadmaps';
    if (location.pathname.startsWith('/problem-roadmap')) return '/problem-roadmap';
    if (location.pathname.startsWith('/users')) return '/users';
    if (location.pathname.startsWith('/auth')) return '/auth';
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