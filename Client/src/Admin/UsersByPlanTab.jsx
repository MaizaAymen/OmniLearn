import React, { useEffect, useState } from "react";
import {
  Button, Card, Col, Form, Input, InputNumber, Modal, Row,
  Segmented, Statistic, Table, Tag, Typography, message,
} from "antd";
import { BankOutlined } from "@ant-design/icons";
import { createInstitution, fetchUsersByPlan } from "./planApi";

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// USERS BY PLAN
// Vue super-admin : voir tous les utilisateurs et filtrer par plan.
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_COLOR = { free: "default", pro: "blue", institution: "purple" };
const ROLE_COLOR = { admin: "red", institution_admin: "magenta", teacher: "blue", student: "green" };

const UsersByPlanTab = () => {
  const [data, setData] = useState({ counts: {}, users: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // ─── PROMOTION VERS INSTITUTION ADMIN ───────────────────────────────────
  // ÉTAPE 1 : on garde le user actuellement sélectionné dans le modal.
  // S'il est null → modal fermé. Sinon → modal ouvert pour ce user-là.
  const [promoting, setPromoting] = useState(null);
  const [form] = Form.useForm();

  // ÉTAPE 2 : on charge la liste filtrée par plan (all / free / pro / institution).
  const load = async (planFilter) => {
    setLoading(true);
    try {
      const res = await fetchUsersByPlan(planFilter === "all" ? null : planFilter);
      setData(res);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  // ÉTAPE 3 : on appelle POST /api/plan/institutions qui :
  //   - crée la ligne Institution
  //   - met à jour le user (role=institution_admin, plan=institution, institutionId=<id>)
  const onPromote = async (values) => {
    try {
      await createInstitution({
        name: values.name,
        adminUserId: promoting.id,
        seatLimit: values.seatLimit || 0,
      });
      message.success(`${promoting.firstname} is now admin of "${values.name}"`);
      setPromoting(null);
      form.resetFields();
      load(filter); // ÉTAPE 4 : on rafraîchit pour voir le nouveau plan / role.
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    { title: "Name", key: "name", render: (_, u) => `${u.firstname} ${u.lastname}` },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (r) => <Tag color={ROLE_COLOR[r]}>{r.replace("_", " ")}</Tag>,
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      render: (p) => <Tag color={PLAN_COLOR[p]}>{p}</Tag>,
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => new Date(d).toLocaleDateString(),
    },
    // ÉTAPE 5 : colonne "Actions" avec le bouton "Promote".
    // Le bouton n'apparaît QUE si le user n'est pas déjà institution / admin /
    // institution_admin (sinon ça n'a pas de sens de le promouvoir).
    {
      title: "Actions",
      key: "actions",
      render: (_, u) => {
        const alreadyInstitution =
          u.plan === "institution" || u.role === "admin" || u.role === "institution_admin";
        if (alreadyInstitution) return null;
        return (
          <Button
            size="small"
            icon={<BankOutlined />}
            onClick={() => setPromoting(u)}
          >
            Promote to Institution Admin
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      {/* ÉTAPE 1 : compteurs par plan */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Free" value={data.counts.free || 0} valueStyle={{ color: "#888" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Pro" value={data.counts.pro || 0} valueStyle={{ color: "#1677ff" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Institution" value={data.counts.institution || 0} valueStyle={{ color: "#722ed1" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total" value={data.counts.total || 0} />
          </Card>
        </Col>
      </Row>

      {/* ÉTAPE 2 : filtre */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>Users by plan</Title>
        <Text type="secondary">Filter the user list by their current plan.</Text>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Free", value: "free" },
              { label: "Pro", value: "pro" },
              { label: "Institution", value: "institution" },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </Card>

      {/* ÉTAPE 3 : tableau */}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data.users}
        columns={columns}
        pagination={{ pageSize: 15 }}
      />

      {/* ─── MODAL DE PROMOTION ───────────────────────────────────────────
          Apparaît quand `promoting` n'est pas null. On demande juste le nom
          de l'institution + le seatLimit (0 = illimité). */}
      <Modal
        open={!!promoting}
        onCancel={() => { setPromoting(null); form.resetFields(); }}
        title={promoting ? `Promote ${promoting.firstname} ${promoting.lastname}` : ""}
        onOk={() => form.submit()}
        okText="Create institution"
        destroyOnHidden
      >
        <Text type="secondary">
          This will create a new institution and make this user its admin.
          They will instantly switch to the <Tag color="purple">institution</Tag> plan.
        </Text>
        <Form form={form} layout="vertical" onFinish={onPromote} style={{ marginTop: 16 }}
          initialValues={{ seatLimit: 0 }}>
          <Form.Item
            name="name"
            label="Institution name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="e.g. Lycée Voltaire" />
          </Form.Item>
          <Form.Item
            name="seatLimit"
            label="Seat limit (0 = unlimited)"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersByPlanTab;
