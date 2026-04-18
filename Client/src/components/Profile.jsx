import { useState, useEffect } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CameraOutlined,
  CloseOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import ImgCrop from "antd-img-crop";
import Cookies from "js-cookie";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const API_BASE = "http://localhost:5000/api";

const roleColor = { admin: "red", teacher: "blue", student: "green" };

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const storedUser = (() => {
    try {
      return JSON.parse(Cookies.get("user") || "{}");
    } catch {
      return {};
    }
  })();
  const token = Cookies.get("token");
  const userId = storedUser?.id;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setUser(data);
      const saved = localStorage.getItem(`avatar_${data.id}`);
      if (saved) setAvatarUrl(saved);
      form.setFieldsValue({
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        role: data.role,
      });
    } catch (err) {
      message.error(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updated = await res.json();
      setUser(updated);
      Cookies.set("user", JSON.stringify({ ...storedUser, ...updated }), { expires: 7 });
      message.success("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      message.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    let values;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: values.newPassword }),
      });
      if (!res.ok) throw new Error("Failed to update password");
      message.success("Password updated successfully");
      setChangingPassword(false);
      passwordForm.resetFields();
    } catch (err) {
      message.error(err.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = ({ file, onSuccess, onError }) => {
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      localStorage.setItem(`avatar_${userId}`, base64);
      setAvatarUrl(base64);
      setUploadingAvatar(false);
      message.success("Avatar updated");
      onSuccess?.();
    };
    reader.onerror = () => {
      setUploadingAvatar(false);
      message.error("Failed to read image");
      onError?.(new Error("Failed to read image"));
    };
    reader.readAsDataURL(file);
  };

  const initials = user
    ? `${user.firstname?.[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "?";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <Text type="secondary">No profile data found. Please log in.</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Card>
        <Row gutter={24} align="middle">
          <Col>
            <ImgCrop rotationSlider quality={0.8} aspectSlider>
              <Upload
                showUploadList={false}
                accept="image/*"
                customRequest={handleAvatarUpload}
              >
                <Tooltip title="Change avatar">
                  <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }}>
                    <Avatar
                      size={96}
                      src={user.avatar || avatarUrl || undefined}
                      style={{ backgroundColor: "#4f46e5", fontSize: 32, fontWeight: 700 }}
                    >
                      {!user.avatar && !avatarUrl && initials}
                    </Avatar>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        background: "#4f46e5",
                        borderRadius: "50%",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #fff",
                      }}
                    >
                      <CameraOutlined style={{ color: "#fff", fontSize: 13 }} />
                    </div>
                    {uploadingAvatar && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.4)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Spin size="small" />
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Upload>
            </ImgCrop>
          </Col>
          <Col flex={1}>
            <Title level={3} style={{ margin: 0 }}>
              {user.firstname} {user.lastname}
            </Title>
            <Text type="secondary">{user.email}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={roleColor[user.role] ?? "default"}>
                {user.role?.toUpperCase()}
              </Tag>
              <Tag color={user.isActive ? "success" : "error"}>
                {user.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
          </Col>
          <Col>
            {!editing ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                icon={<CloseOutlined />}
                onClick={() => {
                  setEditing(false);
                  form.setFieldsValue({
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    role: user.role,
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <div style={{ marginTop: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={14}>
            <Card title="Profile Information">
              {!editing ? (
                <Descriptions column={1} size="middle">
                  <Descriptions.Item label="First Name">{user.firstname}</Descriptions.Item>
                  <Descriptions.Item label="Last Name">{user.lastname}</Descriptions.Item>
                  <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="Role">
                    <Tag color={roleColor[user.role]}>{user.role}</Tag>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Form form={form} layout="vertical" onFinish={handleSave}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        label="First Name"
                        name="firstname"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Last Name"
                        name="lastname"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Required" },
                      { type: "email", message: "Invalid email" },
                    ]}
                  >
                    <Input prefix={<MailOutlined />} />
                  </Form.Item>
                  <Form.Item label="Role" name="role">
                    <Select>
                      <Select.Option value="student">Student</Select.Option>
                      <Select.Option value="teacher">Teacher</Select.Option>
                      <Select.Option value="admin">Admin</Select.Option>
                    </Select>
                  </Form.Item>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={saving}
                    block
                  >
                    Save Changes
                  </Button>
                </Form>
              )}
            </Card>

            <Card
              title="Change Password"
              style={{ marginTop: 16 }}
              extra={
                !changingPassword ? (
                  <Button
                    size="small"
                    icon={<LockOutlined />}
                    onClick={() => setChangingPassword(true)}
                  >
                    Change
                  </Button>
                ) : (
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setChangingPassword(false);
                      passwordForm.resetFields();
                    }}
                  >
                    Cancel
                  </Button>
                )
              }
            >
              {changingPassword ? (
                <Form form={passwordForm} layout="vertical">
                  <Form.Item
                    label="New Password"
                    name="newPassword"
                    rules={[
                      { required: true, message: "Required" },
                      { min: 6, message: "At least 6 characters" },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Form.Item
                    label="Confirm Password"
                    name="confirmPassword"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    block
                    onClick={handlePasswordChange}
                  >
                    Update Password
                  </Button>
                </Form>
              ) : (
                <Text type="secondary">Click "Change" to update your password.</Text>
              )}
            </Card>
          </Col>

          <Col xs={24} md={10}>
            <Card title="Account Details">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="User ID">
                  <Text copyable style={{ fontSize: 11 }}>
                    {user.id}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={user.isActive ? "success" : "error"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Email Verified">
                  <Tag color={user.isEmailVerified ? "success" : "warning"}>
                    {user.isEmailVerified ? "Verified" : "Unverified"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Last Login">
                  {user.lastLoginAt
                    ? dayjs(user.lastLoginAt).format("MMM D, YYYY HH:mm")
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Member Since">
                  {user.createdAt
                    ? dayjs(user.createdAt).format("MMM D, YYYY")
                    : "—"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
