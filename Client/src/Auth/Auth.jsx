import React, { useState, useMemo } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  message,
} from "antd";
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";
import Cookies from "js-cookie";
import { SERVER_URL } from "../config";

const { Title, Text, Link } = Typography;

const API_URL = `${SERVER_URL}/api/auth`;

export const refreshToken = async () => {
  const stored = Cookies.get("refreshToken");
  if (!stored) return null;
  try {
    const res = await axios.post(`${API_URL}/refresh-token`, { refreshToken: stored });
    Cookies.set("token", res.data.token, { expires: 7, path: "/" });
    return res.data.token;
  } catch {
    return null;
  }
};

/* ── Password strength helpers ── */
const PASSWORD_RULES = [
  { id: "length",    label: "At least 8 characters",      test: (p) => p.length >= 8 },
  { id: "upper",     label: "One uppercase letter (A–Z)",  test: (p) => /[A-Z]/.test(p) },
  { id: "lower",     label: "One lowercase letter (a–z)",  test: (p) => /[a-z]/.test(p) },
  { id: "number",    label: "One number (0–9)",            test: (p) => /\d/.test(p) },
  { id: "special",   label: "One special character (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
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

/* ── OmniLearn SVG Logo ── */
const OmniLearnLogo = ({ size = 44 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" fill="#d6d690" stroke="#3d2817" strokeWidth="3" />
    <circle cx="40" cy="40" r="20" fill="#e8a8d4" stroke="#3d2817" strokeWidth="3" />
    <circle cx="54" cy="60" r="14" fill="#7fd0cc" stroke="#3d2817" strokeWidth="3" />
    <circle cx="74" cy="46" r="7" fill="#f4b87a" stroke="#3d2817" strokeWidth="3" />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [require2FA, setRequire2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const { score, rules } = usePasswordStrength(passwordValue);
  const passwordLengthOk = passwordValue.length >= 8;
  const passwordsMatch = confirmValue.length > 0 && confirmValue === passwordValue;
  const showLengthError = !isLogin && passwordTouched && passwordValue.length > 0 && !passwordLengthOk;
  const showMatchError = !isLogin && confirmTouched && confirmValue.length > 0 && !passwordsMatch;

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setPasswordValue("");
    setConfirmValue("");
    setPasswordTouched(false);
    setConfirmTouched(false);
    form.resetFields();
  };

  const handle2FAVerify = async () => {
    if (!otpValue || otpValue.length !== 6) {
      return message.error("Please enter the 6-digit code");
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/2fa/verify`, {
        userId: pendingUserId,
        token: otpValue,
      });
      Cookies.set("token", res.data.token, { expires: 7, path: "/" });
      Cookies.set("refreshToken", res.data.refreshToken, { expires: 7, path: "/" });
      Cookies.set("user", JSON.stringify(res.data.user), { expires: 7, path: "/" });
      message.success("Welcome back!");
      window.location.href = "/problems";
    } catch (err) {
      message.error(err.response?.data?.error || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/login`, {
          email: values.email,
          password: values.password,
        });
        if (res.data.require2FA) {
          setRequire2FA(true);
          setPendingUserId(res.data.userId);
          setLoading(false);
          return;
        }
        Cookies.set("token", res.data.token, { expires: 7, path: "/" });
        Cookies.set("refreshToken", res.data.refreshToken, { expires: 7, path: "/" });
        Cookies.set("user", JSON.stringify(res.data.user), { expires: 7, path: "/" });
        message.success("Welcome back!");
        window.location.href = "/problems";
      } else {
        await axios.post(`${API_URL}/register`, {
          firstname: values.firstName,
          lastname: values.lastName,
          email: values.email,
          password: values.password,
          role: "student",
        });
        message.success("Account created! Please sign in.");
        setIsLogin(true);
        setPasswordValue("");
        form.resetFields();
      }
    } catch (err) {
      message.error(
        err.response?.data?.error || err.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/google`, {
        credential: credentialResponse.credential,
      });
      Cookies.set("token", res.data.token, { expires: 7, path: "/" });
      Cookies.set("refreshToken", res.data.refreshToken, { expires: 7, path: "/" });
      Cookies.set("user", JSON.stringify(res.data.user), { expires: 7, path: "/" });
      message.success("Logged in with Google!");
      window.location.href = "/problems";
    } catch (err) {
      message.error(err.response?.data?.error || err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* ── Left panel ── */}
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
          <img
            src="/auth-illustration.svg"
            alt="Learning illustration"
            className="auth-illustration"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-form-wrapper">

          {/* ── 2FA step ── */}
          {require2FA ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <Title level={3} className="auth-title">Two-Factor Auth</Title>
              <Text className="auth-subtitle">
                Enter the 6-digit code from your authenticator app
              </Text>
              <div style={{ margin: "28px 0" }}>
                <Input
                  placeholder="000000"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  size="large"
                  style={{
                    textAlign: "center",
                    fontSize: 30,
                    letterSpacing: 14,
                    width: 220,
                    borderRadius: 14,
                    border: "1.5px solid #e5e7eb",
                    padding: "12px 16px",
                    fontWeight: 700,
                    color: "#0f0c29",
                  }}
                  onPressEnter={handle2FAVerify}
                />
              </div>
              <Button type="primary" loading={loading} block className="auth-submit-btn" onClick={handle2FAVerify}>
                Verify Code
              </Button>
              <Button
                type="text"
                style={{ marginTop: 12, width: "100%", color: "#7c3aed", fontWeight: 600 }}
                onClick={() => { setRequire2FA(false); setPendingUserId(null); setOtpValue(""); form.resetFields(); }}
              >
                Back to login
              </Button>
            </div>
          ) : (
            <>
              {/* Logo in form card (mobile / right panel) */}
              <div className="form-logo">
                <OmniLearnLogo size={36} />
                <span className="form-logo-text">OmniLearn</span>
              </div>

              <Title level={2} className="auth-title">
                {isLogin ? "Welcome Back" : "Create Account"}
              </Title>
              <Text type="secondary" className="auth-subtitle">
                {isLogin
                  ? "Sign in to continue your learning journey"
                  : "Join OmniLearn and start learning"}
              </Text>

              {/* Google Login */}
              <div className="google-btn-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => message.error("Google login failed")}
                  width="100%"
                  shape="rectangular"
                  size="large"
                  text={isLogin ? "signin_with" : "signup_with"}
                  theme="outline"
                />
              </div>

              <Divider plain>
                <Text type="secondary">or</Text>
              </Divider>

              {/* Form */}
              <Form
                form={form}
                name="auth"
                onFinish={onFinish}
                layout="vertical"
                size="large"
                requiredMark={false}
              >
                {!isLogin && (
                  <div className="name-row">
                    <Form.Item
                      name="firstName"
                      rules={[{ required: true, message: "First name required" }]}
                      className="name-field"
                    >
                      <Input prefix={<UserOutlined />} placeholder="First Name" />
                    </Form.Item>
                    <Form.Item
                      name="lastName"
                      rules={[{ required: true, message: "Last name required" }]}
                      className="name-field"
                    >
                      <Input prefix={<UserOutlined />} placeholder="Last Name" />
                    </Form.Item>
                  </div>
                )}

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Email is required" },
                    { type: "email", message: "Enter a valid email" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Email" />
                </Form.Item>

                {isLogin ? (
                  <>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: "Password is required" }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <div style={{ textAlign: "right", marginBottom: 20 }}>
                      <Link
                        strong
                        onClick={() => navigate("/forgot-password")}
                        style={{ color: "#7c3aed", fontSize: 13 }}
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
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
                            placeholder="Password"
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

                    {/* Optional strength conditions */}
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
                  </>
                )}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    className="auth-submit-btn"
                  >
                    {isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </Form.Item>
              </Form>

              <div className="auth-toggle">
                <Text type="secondary">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <Link onClick={toggleMode} strong>
                  {isLogin ? "Sign Up" : "Sign In"}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
