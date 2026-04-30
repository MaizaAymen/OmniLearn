import React, { useEffect, useState } from "react";
import { Button, Card, Empty, Form, InputNumber, Select, Table, Tag, message } from "antd";
import Cookies from "js-cookie";
import {
  createInviteLink, fetchInviteLinks, fetchInstitutionMembers, revokeInviteLink,
} from "./planApi";

// Vue institution_admin : générer des liens et lister les membres.
const getInstitutionId = () => {
  try { return JSON.parse(Cookies.get("user") || "null")?.institutionId || null; }
  catch { return null; }
};

const inviteUrl = (token) => `${window.location.origin}/join-institution/${token}`;

const InstitutionTab = () => {
  const id = getInstitutionId();
  const [links, setLinks] = useState([]);
  const [members, setMembers] = useState([]);
  const [form] = Form.useForm();

  // ÉTAPE 1 : on charge les liens et les membres.
  const load = async () => {
    if (!id) return;
    try {
      setLinks(await fetchInviteLinks(id));
      setMembers(await fetchInstitutionMembers(id));
    } catch (err) { message.error(err.message); }
  };
  useEffect(() => { load(); }, []);

  // ÉTAPE 2 : créer un lien d'invitation.
  const onCreate = async (values) => {
    try {
      await createInviteLink(id, values);
      message.success("Link created");
      form.resetFields();
      load();
    } catch (err) { message.error(err.message); }
  };

  if (!id) return <Empty description="You are not linked to any institution." />;

  return (
    <div>
      {/* Formulaire de création de lien */}
      <Card title="Generate invite link" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={onCreate}
          initialValues={{ role: "student", maxUses: 0, expiresInDays: 30 }}>
          <Form.Item name="role" label="Role">
            <Select style={{ width: 140 }} options={[
              { value: "student", label: "Student" },
              { value: "teacher", label: "Teacher" },
            ]} />
          </Form.Item>
          <Form.Item name="maxUses" label="Max uses (0 = ∞)">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="expiresInDays" label="Expires in (days, 0 = never)">
            <InputNumber min={0} style={{ width: 90 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">Create</Button>
        </Form>
      </Card>

      {/* Tableau des liens */}
      <Card title="Invite links" style={{ marginBottom: 16 }}>
        <Table rowKey="token" dataSource={links} pagination={false}
          columns={[
            { title: "Role", dataIndex: "role", render: (r) => <Tag>{r}</Tag> },
            {
              title: "URL", dataIndex: "token",
              render: (t) => <a onClick={() => navigator.clipboard.writeText(inviteUrl(t))}>Copy link</a>,
            },
            { title: "Used", render: (_, l) => `${l.usedCount} / ${l.maxUses || "∞"}` },
            {
              title: "Status",
              render: (_, l) => l.revoked
                ? <Tag color="red">Revoked</Tag>
                : <Tag color="green">Active</Tag>,
            },
            {
              title: "",
              render: (_, l) => !l.revoked && (
                <Button size="small" danger onClick={async () => {
                  await revokeInviteLink(l.token); load();
                }}>Revoke</Button>
              ),
            },
          ]} />
      </Card>

      {/* Membres */}
      <Card title={`Members (${members.length})`}>
        <Table rowKey="id" dataSource={members} pagination={{ pageSize: 10 }}
          columns={[
            { title: "Name", render: (_, u) => `${u.firstname} ${u.lastname}` },
            { title: "Email", dataIndex: "email" },
            { title: "Role", dataIndex: "role", render: (r) => <Tag>{r}</Tag> },
          ]} />
      </Card>
    </div>
  );
};

export default InstitutionTab;
