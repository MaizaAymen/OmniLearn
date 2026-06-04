import React, { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";
import { SERVER_URL } from "../config";

const { Title, Text } = Typography;
const API_URL = `${SERVER_URL}/api/auth`;

const OmniLearnLogo = ({ size = 44 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="32" fill="#c8cc6b" />
    <circle cx="36" cy="30" r="14" fill="#5bc4c0" opacity="0.92" />
    <circle cx="24" cy="24" r="12" fill="#f08baa" opacity="0.92" />
    <circle cx="30" cy="28" r="5" fill="#fff" opacity="0.2" />
  </svg>
);

const ForgotPassword = ({ onBack }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form] = Form.useForm();
  const [email, setEmail] = useState("");

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/forgot-password`, {
        email: values.email,
      });
      setEmail(values.email);
      setSent(true);
      message.success("Check your email for the reset link!");
    } catch (error) {
      message.error(error.response?.data?.error || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setSent(false);
    setEmail("");
    form.resetFields();
    navigate("/auth");
  };

  if (sent) {
    return (
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-left-content">
            <div className="auth-brand">
              <div className="auth-logo">
                <OmniLearnLogo size={52} />
                <span className="logo-text">OmniLearn</span>
              </div>
              <p className="auth-tagline">
                Intelligent Adaptive Learning Platform powered by AI
              </p>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrapper">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
              <Title level={3} className="auth-title">Check Your Email</Title>
              <Text className="auth-subtitle">
                We've sent a password reset link to <strong>{email}</strong>
              </Text>
              <div style={{ margin: "32px 0", padding: "20px", backgroundColor: "#f0fdf4", borderRadius: 12 }}>
                <Text style={{ color: "#166534", fontSize: 14 }}>
                  ✓ Check your inbox (and spam folder) for a link that expires in 1 hour
                </Text>
              </div>
              <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
                Click the link to reset your password
              </Text>
              <Button
                type="primary"
                block
                className="auth-submit-btn"
                onClick={handleBackToLogin}
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="auth-logo">
              <OmniLearnLogo size={52} />
              <span className="logo-text">OmniLearn</span>
            </div>
            <p className="auth-tagline">
              Intelligent Adaptive Learning Platform powered by AI
            </p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="form-logo">
            <OmniLearnLogo size={36} />
            <span className="form-logo-text">OmniLearn</span>
          </div>

          <Title level={2} className="auth-title">Forgot Password?</Title>
          <Text type="secondary" className="auth-subtitle">
            Enter your email and we'll send you a link to reset your password
          </Text>

          <Form
            form={form}
            name="forgot"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="your@email.com" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="auth-submit-btn"
              >
                Send Reset Link
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-toggle" style={{ marginTop: 16 }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/auth")}
              style={{ color: "#7c3aed", fontWeight: 600, padding: 0 }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
