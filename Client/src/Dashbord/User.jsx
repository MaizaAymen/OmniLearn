import React, { useState, useEffect } from "react";
import {
    Table,
    Button,
    Card,
    Space,
    Tag,
    Popconfirm,
    message,
    Row,
    Col,
    Statistic,
    Modal,
    Form,
    Input,
    Select,
} from "antd";
import { DeleteOutlined, ReloadOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Column } from "@ant-design/plots";
import dayjs from "dayjs";

const API_BASE = "http://localhost:5000/api";

const getErrorMessage = async (response, fallbackMessage) => {
    try {
        const data = await response.json();
        return data?.error || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
};

const User = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [modalMode, setModalMode] = useState("create");
    const [form] = Form.useForm();

    const requestUsers = async () => {
        const response = await fetch(`${API_BASE}/getAllUsers`);
        if (!response.ok) {
            throw new Error(await getErrorMessage(response, "Failed to fetch users"));
        }
        return response.json();
    };

    const requestUserById = async (userId) => {
        const response = await fetch(`${API_BASE}/users/${userId}`);
        if (!response.ok) {
            throw new Error(await getErrorMessage(response, "Failed to fetch user"));
        }
        return response.json();
    };

    const requestCreateUser = async (payload) => {
        const response = await fetch(`${API_BASE}/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response, "Failed to create user"));
        }
        return response.json();
    };

    const requestUpdateUser = async (userId, payload) => {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response, "Failed to update user"));
        }
        return response.json();
    };

    const requestDeleteUser = async (userId) => {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response, "Failed to delete user"));
        }
    };

    const openCreateModal = () => {
        setModalMode("create");
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ role: "student" });
        setIsModalOpen(true);
    };

    const openEditModal = async (user) => {
        try {
            setSubmitting(true);
            const userDetails = await requestUserById(user.id);
            setModalMode("edit");
            setEditingUser(userDetails);
            form.setFieldsValue({
                firstname: userDetails.firstname,
                lastname: userDetails.lastname,
                email: userDetails.email,
                role: userDetails.role,
                password: "",
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error("Error opening edit modal:", error);
            message.error(error.message || "Failed to load user details");
        } finally {
            setSubmitting(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await requestUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error(error.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        try {
            await requestDeleteUser(userId);
            setUsers((prev) => prev.filter((user) => user.id !== userId));
            message.success("User deleted successfully");
        } catch (error) {
            console.error("Error deleting user:", error);
            message.error(error.message || "Failed to delete user");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        form.resetFields();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const payload = {
                firstname: values.firstname,
                lastname: values.lastname,
                email: values.email,
                role: values.role,
            };

            if (values.password && values.password.trim()) {
                payload.password = values.password;
            }

            if (modalMode === "create") {
                if (!payload.password) {
                    message.error("Password is required for new users");
                    setSubmitting(false);
                    return;
                }

                const createdUser = await requestCreateUser(payload);
                setUsers((prev) => [createdUser, ...prev]);
                message.success("User created successfully");
            } else {
                const updatedUser = await requestUpdateUser(editingUser.id, payload);
                setUsers((prev) =>
                    prev.map((user) => (user.id === editingUser.id ? updatedUser : user))
                );
                message.success("User updated successfully");
            }

            closeModal();
        } catch (error) {
            console.error(error);
            message.error(
                error.message ||
                    (modalMode === "create" ? "Failed to create user" : "Failed to update user")
            );
        } finally {
            setSubmitting(false);
        }
    };

    const roleColorMap = {
        admin: "blue",
        teacher: "gold",
        student: "green",
    };

    const roleCounts = users.reduce(
        (acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        },
        { admin: 0, teacher: 0, student: 0 }
    );

    const roleData = [
        { type: "Admin", value: roleCounts.admin },
        { type: "Teacher", value: roleCounts.teacher },
        { type: "Student", value: roleCounts.student },
    ];

    const activeData = [
        { status: "Active", value: users.filter((u) => u.isActive).length },
        { status: "Inactive", value: users.filter((u) => !u.isActive).length },
    ];

    const columns = [
        {
            title: "Name",
            key: "name",
            render: (_, record) => `${record.firstname} ${record.lastname}`,
            sorter: (a, b) => a.firstname.localeCompare(b.firstname),
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (role) => (
                <Tag color={roleColorMap[role] || "default"}>
                    {role.toUpperCase()}
                </Tag>
            ),
            filters: [
                { text: "Admin", value: "admin" },
                { text: "Teacher", value: "teacher" },
                { text: "Student", value: "student" },
            ],
            onFilter: (value, record) => record.role === value,
        },
        {
            title: "Status",
            key: "status",
            render: (_, record) => (
                <Tag color={record.isActive ? "success" : "default"}>
                    {record.isActive ? "Active" : "Inactive"}
                </Tag>
            ),
            filters: [
                { text: "Active", value: "active" },
                { text: "Inactive", value: "inactive" },
            ],
            onFilter: (value, record) =>
                value === "active" ? record.isActive : !record.isActive,
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (date) => dayjs(date).format("YYYY-MM-DD"),
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
        {
            title: "Updated At",
            dataIndex: "updatedAt",
            key: "updatedAt",
            render: (date) => dayjs(date).format("YYYY-MM-DD"),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />

                    <Popconfirm
                        title="Delete user"
                        description="Are you sure you want to delete this user?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button danger type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const roleChartConfig = {
        data: roleData,
        xField: "type",
        yField: "value",
        color: ({ type }) => {
            if (type === "Admin") return "#1890ff";
            if (type === "Teacher") return "#faad14";
            return "#52c41a";
        },
        label: {
            position: "top",
            style: { fill: '#000000A6', opacity: 0.6 },
        },
    };

    const activeChartConfig = {
        data: activeData,
        xField: "status",
        yField: "value",
        color: ({ status }) => (status === "Active" ? "#52c41a" : "#ff4d4f"),
        label: {
            position: "top",
            style: { fill: '#000000A6', opacity: 0.6 },
        },
    };

    return (
        <div style={{ padding: 24 }}>
            <Modal
                title={modalMode === "create" ? "Create User" : "Edit User"}
                open={isModalOpen}
                onOk={handleSubmit}
                onCancel={closeModal}
                confirmLoading={submitting}
                okText={modalMode === "create" ? "Create" : "Update"}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="firstname"
                        label="First Name"
                        rules={[{ required: true, message: "First name is required" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="lastname"
                        label="Last Name"
                        rules={[{ required: true, message: "Last name is required" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: "Email is required" },
                            { type: "email", message: "Enter a valid email" },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={modalMode === "create" ? "Password" : "Password (optional)"}
                        rules={
                            modalMode === "create"
                                ? [{ required: true, message: "Password is required" }]
                                : []
                        }
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: "Role is required" }]}
                    >
                        <Select>
                            <Select.Option value="admin">Admin</Select.Option>
                            <Select.Option value="teacher">Teacher</Select.Option>
                            <Select.Option value="student">Student</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
                    User Management
                </h1>
                <p style={{ fontSize: 16, color: '#6b7280' }}>
                    Manage and monitor all registered users
                </p>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Users"
                            value={users.length}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Active Users"
                            value={users.filter((u) => u.isActive).length}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Admins"
                            value={users.filter((u) => u.role === "admin").length}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Students"
                            value={users.filter((u) => u.role === "student").length}
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={12}>
                    <Card title="Users by Role">
                        <Column {...roleChartConfig} height={200} />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="Users by Status">
                        <Column {...activeChartConfig} height={200} />
                    </Card>
                </Col>
            </Row>

            <Card
                title="User List"
                extra={
                    <Space>
                        <Button icon={<PlusOutlined />} type="primary" onClick={openCreateModal}>
                            Add User
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
                            Refresh
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    bordered
                />
            </Card>
        </div>
    );
};

export default User;