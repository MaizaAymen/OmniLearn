import React, { useState, useEffect } from "react";
import { Table, Button, Card, Space, Tag, Popconfirm, message, Row, Col, Statistic,Popover  } from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { Column } from "@ant-design/plots"; // Ant Design Charts
import dayjs from "dayjs"; // For date formatting
import { Modal, Form, Input, Select } from "antd";
import { EditOutlined } from "@ant-design/icons";

const User = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

const openEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
};

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:5000/api/getAllUsers");
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };
   const handleDelete = async (userId) => {
        try {
            await fetch(`http://localhost:5000/api/users/${userId}`, {
                method: "DELETE",
            });
            setUsers(users.filter((user) => user._id !== userId));
            message.success("User deleted successfully");
        } catch (error) {
            console.error("Error deleting user:", error);
            message.error("Failed to delete user");
        }
    };
    useEffect(() => {
        fetchUsers();
        handleDelete();
    }, []);

const handleEdit = async () => {
    try {
        const values = await form.validateFields();

        await fetch(`http://localhost:5000/api/users/${editingUser._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
        });

        setUsers((prev) =>
            prev.map((user) =>
                user._id === editingUser._id
                    ? { ...user, ...values }
                    : user
            )
        );

        message.success("User updated successfully");

        setIsModalOpen(false);
        form.resetFields();
    } catch (error) {
        console.error(error);
        message.error("Failed to update user");
    }
};

    const roleData = [
        { type: "Admin", value: users.filter(u => u.role === "admin").length },
        { type: "User", value: users.filter(u => u.role === "user").length },
    ];

    const activeData = [
        { status: "Active", value: users.filter(u => u.isActive).length },
        { status: "Inactive", value: users.filter(u => !u.isActive).length },
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
                <Tag color={role === "admin" ? "blue" : "green"}>
                    {role.toUpperCase()}
                </Tag>
            ),
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
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
                { text: 'Active', value: true },
                { text: 'Inactive', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
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
                <Popconfirm
                    title="Delete user"
                    description="Are you sure you want to delete this user?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        size="small"
                    />
                </Popconfirm>
                           ),
        },{
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
                onConfirm={() => handleDelete(record._id)}
            >
                <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                />
            </Popconfirm>

        </Space>
    ),
}
    ];

    // Chart configurations
    const roleChartConfig = {
        data: roleData,
        xField: 'type',
        yField: 'value',
        color: ({ type }) => (type === 'Admin' ? '#1890ff' : '#52c41a'),
        label: {
            position: 'top',
            style: { fill: '#000000A6', opacity: 0.6 },
        },
    };

    const activeChartConfig = {
        data: activeData,
        xField: 'status',
        yField: 'value',
        color: ({ status }) => (status === 'Active' ? '#52c41a' : '#ff4d4f'),
        label: {
            position: 'top',
            style: { fill: '#000000A6', opacity: 0.6 },
        },
    };

    return (
        <div style={{ padding: 24 }}>
            <Modal
    title="Edit User"
    open={isModalOpen}
    onOk={handleEdit}
    onCancel={() => setIsModalOpen(false)}
    okText="Update"
>
    <Form form={form} layout="vertical">

        <Form.Item name="firstname" label="First Name">
            <Input />
        </Form.Item>

        <Form.Item name="lastname" label="Last Name">
            <Input />
        </Form.Item>

        <Form.Item name="email" label="Email">
            <Input />
        </Form.Item>

        <Form.Item name="role" label="Role">
            <Select>
                <Select.Option value="admin">Admin</Select.Option>
                <Select.Option value="user">User</Select.Option>
            </Select>
        </Form.Item>

    </Form>
</Modal>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
                    User Management
                </h1>
                <p style={{ fontSize: 16, color: '#6b7280' }}>
                    Manage and monitor all registered users
                </p>
            </div>

            {/* Statistics Cards & Charts */}
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
                            value={users.filter(u => u.isActive).length} 
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic 
                            title="Admins" 
                            value={users.filter(u => u.role === 'admin').length} 
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic 
                            title="Regular Users" 
                            value={users.filter(u => u.role === 'user').length} 
                            loading={loading}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
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

            {/* User Table */}
            <Card
                title="User List"
                extra={
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={fetchUsers} 
                        loading={loading}
                    >
                        Refresh
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    bordered
                />
            </Card>
        </div>
    );
};

export default User;