import React, { useState, useEffect, useMemo } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { LockOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import "./Auth.css";

const { Title, Text } = Typography;
const API_URL = "http://localhost:5000/api/auth";

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number (0–9)", test: (p) => /\d/.test(p) },
  { id: "special", label: "One special character (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["#e5e7eb", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

function usePasswordStrength(password) {
  return useMemo(() => {
    if (!password) return { score: 0, rules: PASSWORD_RULES.map((r) => ({ ...r, passed: false })) };
    const rules = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
    const score = rules.filter((r) => r.passed).length;
    return { score, rules };
  }, [password]);
}

const OmniLearnLogo = ({ size = 44 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="32" r="32" fill="#c8cc6b" />
    <circle cx="36" cy="30" r="14" fill="#5bc4c0" opacity="0.92" />
    <circle cx="24" cy="24" r="12" fill="#f08baa" opacity="0.92" />
    <circle cx="30" cy="28" r="5" fill="#fff" opacity="0.2" />
  </svg>
);

const ResetPassword = ({ onSuccess }) => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [form] = Form.useForm();
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const token = searchParams.get("token");

  const { score, rules } = usePasswordStrength(passwordValue);
  const passwordLengthOk = passwordValue.length >= 8;
  const passwordsMatch = confirmValue.length > 0 && confirmValue === passwordValue;
  const showLengthError = passwordTouched && passwordValue.length > 0 && !passwordLengthOk;
  const showMatchError = confirmTouched && confirmValue.length > 0 && !passwordsMatch;

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      message.error("Reset link is missing");
      return;
    }
    setTokenValid(true);
  }, [token]);

  const handleSubmit = async (values) => {
    if (!token) {
      message.error("Reset token is missing");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/reset-password`, {
        token,
        newPassword: values.password,
      });
      message.success("Password reset successfully!");
      form.resetFields();
      setPasswordValue("");
      setConfirmValue("");
      setTimeout(() => {
        onSuccess?.();
        window.location.href = "/auth";
      }, 1500);
    } catch (error) {
      message.error(error.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === false) {
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
              <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
              <Title level={3} className="auth-title">Invalid Reset Link</Title>
              <Text className="auth-subtitle">
                The password reset link is missing or invalid
              </Text>
              <Button
                type="primary"
                block
                className="auth-submit-btn"
                style={{ marginTop: 32 }}
                onClick={() => (window.location.href = "/auth")}
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

          <Title level={2} className="auth-title">Reset Your Password</Title>
          <Text type="secondary" className="auth-subtitle">
            Create a strong password to secure your account
          </Text>

          <Form
            form={form}
            name="reset"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <div className="pwd-row">
              <div className="pwd-field">
                <Form.Item
                  name="password"
                  validateTrigger={["onChange", "onBlur"]}
                  rules={[
                    { required: true, message: "Password is required" },
                    {
                      validator: (_, value) =>
                        !value || value.length >= 8
                          ? Promise.resolve()
                          : Promise.reject(new Error("Min 8 characters")),
                    },
                  ]}
                  help={showLengthError ? "Min 8 characters" : undefined}
                  validateStatus={showLengthError ? "error" : undefined}
                  style={{ marginBottom: 6 }}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="New Password"
                    value={passwordValue}
                    onChange={(e) => {
                      setPasswordValue(e.target.value);
                      setPasswordTouched(true);
                    }}
                    onBlur={() => setPasswordTouched(true)}
                  />
                </Form.Item>
                <div className="pwd-bar-row pwd-bar-row--mini">
                  {PASSWORD_RULES.map((_, i) => (
                    <div
                      key={i}
                      className="pwd-bar-segment"
                      style={{
                        background: showLengthError
                          ? "#ef4444"
                          : i < score
                          ? STRENGTH_COLORS[score]
                          : "#e5e7eb",
                        transition: "background 0.3s ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="pwd-field">
                <Form.Item
                  name="confirmPassword"
                  dependencies={["password"]}
                  validateTrigger={["onChange", "onBlur"]}
                  rules={[
                    { required: true, message: "Confirm your password" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Passwords don't match"));
                      },
                    }),
                  ]}
                  help={showMatchError ? "Passwords don't match" : undefined}
                  validateStatus={showMatchError ? "error" : undefined}
                  style={{ marginBottom: 6 }}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirm Password"
                    value={confirmValue}
                    onChange={(e) => {
                      setConfirmValue(e.target.value);
                      setConfirmTouched(true);
                    }}
                    onBlur={() => setConfirmTouched(true)}
                  />
                </Form.Item>
                <div className="pwd-bar-row pwd-bar-row--mini">
                  {PASSWORD_RULES.map((_, i) => (
                    <div
                      key={i}
                      className="pwd-bar-segment"
                      style={{
                        background: showMatchError
                          ? "#ef4444"
                          : passwordsMatch
                          ? "#22c55e"
                          : "#e5e7eb",
                        transition: "background 0.3s ease",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {passwordValue && (
              <div className="pwd-strength-wrapper">
                <div className="pwd-strength-label" style={{ color: STRENGTH_COLORS[score] }}>
                  {STRENGTH_LABELS[score]}
                </div>
                <ul className="pwd-rules">
                  {rules.map((rule) => (
                    <li key={rule.id} className={`pwd-rule ${rule.passed ? "passed" : "failed"}`}>
                      {rule.passed
                        ? <CheckCircleFilled className="pwd-rule-icon passed" />
                        : <CloseCircleFilled className="pwd-rule-icon failed" />
                      }
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="auth-submit-btn"
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-toggle" style={{ marginTop: 16 }}>
            <Button
              type="text"
              onClick={() => (window.location.href = "/auth")}
              style={{ color: "#7c3aed", fontWeight: 600, width: "100%" }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
