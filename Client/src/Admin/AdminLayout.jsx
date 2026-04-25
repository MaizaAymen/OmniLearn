import React, { useState } from "react";
import { Button, Layout, Menu, Typography } from "antd";
import {
  AppstoreOutlined,
  ClusterOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import Cookies from "js-cookie";
import "./AdminLayout.css";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const allSections = [
  { key: "grades",       label: "Grades",       icon: <TrophyOutlined />, roles: ["admin"] },
  { key: "specialities", label: "Specialities",  icon: <ClusterOutlined />, roles: ["admin"] },
  { key: "levels",       label: "Levels",        icon: <AppstoreOutlined />, roles: ["admin"] },
  { key: "classrooms",   label: "Classrooms",    icon: <TeamOutlined />, roles: ["admin", "teacher"] },
  { key: "problems",     label: "Problem Bank",  icon: <CodeOutlined />, roles: ["admin", "teacher"] },
];

const getRole = () => {
  try { return JSON.parse(Cookies.get("user") || "null")?.role || null; } catch { return null; }
};

const AdminLayout = ({ activeSection, onSectionChange, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const role = getRole();
  const sections = allSections.filter((s) => !role || s.roles.includes(role));

  return (
    <Layout className="admin-shell">
      <Sider
        width={220}
        className="admin-sider"
        breakpoint="lg"
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        trigger={null}
      >
        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          items={sections}
          onClick={(info) => onSectionChange(info.key)}
          className="admin-menu"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div className="admin-header-inner">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="admin-collapse-button"
            />
            <div>
              <Title level={3} className="admin-header-title">
                {sections.find((item) => item.key === activeSection)?.label}
              </Title>
              <Text className="admin-header-text">Manage content in a clean workspace.</Text>
            </div>
          </div>
        </Header>
        <Content className="admin-content">{children}</Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
