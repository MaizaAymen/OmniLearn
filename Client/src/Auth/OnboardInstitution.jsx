import React, { useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, message } from "antd";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { selfCreateInstitution } from "../Admin/planApi";

// Page d'onboarding affichée après l'upgrade au plan Institution.
const OnboardInstitution = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { institution, role } = await selfCreateInstitution(values);
      const user = JSON.parse(Cookies.get("user") || "{}");
      Cookies.set("user", JSON.stringify({ ...user, role, institutionId: institution.id }));
      message.success(`Welcome to ${institution.name}!`);
      window.location.href = "/education";
    } catch (err) {
      message.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 520, margin: "40px auto" }}>
      <Card title="Create your institution">
        <Form layout="vertical" onFinish={onFinish} initialValues={{ type: "school", estimatedUsers: 50 }}>
          <Form.Item name="name" label="Institution name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Lycée Voltaire" />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select options={[
              { value: "school", label: "School" },
              { value: "university", label: "University" },
              { value: "training_center", label: "Training center" },
              { value: "company", label: "Company" },
            ]} />
          </Form.Item>
          <Form.Item name="logo" label="Logo URL (optional)"><Input /></Form.Item>
          <Form.Item name="contactEmail" label="Contact email (optional)"><Input type="email" /></Form.Item>
          <Form.Item name="estimatedUsers" label="Estimated users (≤50 Starter, ≤200 Growth)">
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Create</Button>
        </Form>
      </Card>
    </div>
  );
};

export default OnboardInstitution;
