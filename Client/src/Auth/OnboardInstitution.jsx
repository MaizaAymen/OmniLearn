import React, { useState } from "react";
import { Avatar, Button, Card, Form, Input, InputNumber, Select, Spin, Tooltip, Upload, message } from "antd";
import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import ImgCrop from "antd-img-crop";
import Cookies from "js-cookie";
import { selfCreateInstitution } from "../Admin/planApi";

const API_BASE = "http://localhost:5000/api";

const OnboardInstitution = () => {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async ({ file, onSuccess, onError }) => {
    const token = Cookies.get("token");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`${API_BASE}/plan/institutions/logo-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLogoUrl(data.url);
      onSuccess?.();
    } catch (err) {
      message.error("Failed to upload logo");
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { institution, role } = await selfCreateInstitution({ ...values, logo: logoUrl });
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

          <Form.Item label="Logo (optional)">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ImgCrop rotationSlider quality={0.8} aspectSlider>
                <Upload showUploadList={false} accept="image/*" customRequest={handleLogoUpload}>
                  <Tooltip title="Upload logo">
                    <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }}>
                      <Avatar
                        size={96}
                        src={logoUrl || undefined}
                        style={{ backgroundColor: "#722ed1", fontSize: 32, fontWeight: 700 }}
                      >
                        {!logoUrl && "L"}
                      </Avatar>
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          background: "#722ed1",
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
                      {uploading && (
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
              {logoUrl && (
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setLogoUrl(null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </Form.Item>

          <Form.Item name="contactEmail" label="Contact email (optional)">
            <Input type="email" />
          </Form.Item>
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
