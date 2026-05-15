import React, { useEffect, useState } from "react";
import { Button, Card, Form, InputNumber, message, Typography } from "antd";
import { fetchPlanPricing, changeamount } from "./planApi";

const { Title, Text } = Typography;

// Super admin : modifier le prix des plans Pro et Institution.
// Les montants sont stockés en centimes USD (999 = $9.99).
const PlanPricingTab = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPlanPricing();
      form.setFieldsValue({
        pro: (data.pro || 0) / 100,
        institution: (data.institution || 0) / 100,
      });
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await changeamount(
        Math.round(Number(values.pro) * 100),
        Math.round(Number(values.institution) * 100)
      );
      message.success("Prices updated");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Title level={4}>Plan Pricing</Title>
      <Text type="secondary">
        Set the one-time price (in USD) for Pro and Institution plans.
      </Text>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 24, maxWidth: 360 }}
      >
        <Form.Item label="Pro Plan ($)" name="pro" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Institution Plan ($)" name="institution" rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save
        </Button>
      </Form>
    </Card>
  );
};

export default PlanPricingTab;
