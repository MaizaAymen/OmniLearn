import React, { useState } from "react";
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
  GoogleOutlined,
} from "@ant-design/icons";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import "./Auth.css";
import Cookies from "js-cookie";



const { Title, Text, Link } = Typography;

const API_URL = "http://localhost:5000/api/auth";

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

const Auth = () => {
  //   const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const [firstname, setFirstname] = useState("");
  // const [lastname, setLastname] = useState("");
  // const [role, setRole] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  // 2FA state: when login returns require2FA=true, show OTP step
  const [require2FA, setRequire2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [otpValue, setOtpValue] = useState("");


  const toggleMode = () => {
    setIsLogin(!isLogin);
    form.resetFields();
  };

  // Handle OTP submission during 2FA login step
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

        // If 2FA is enabled, show the OTP step instead of logging in
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
      Cookies.set("user", JSON.stringify(res.data.user), { expires: 7, path: "/" });
      message.success("Logged in with Google!");
      window.location.href = "/";
    } catch (err) {
      message.error(
        err.response?.data?.message || "Google login failed"
      );
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="auth-container">
      {/* Left side — illustration */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="auth-logo">
              <span className="logo-icon">🧠</span>
              <span className="logo-text">SmartLearn Lab AI</span>
            </div>
            <p className="auth-tagline">
              Intelligent Adaptive Learning Platform powered by AI
            </p>
          </div>
          <img
            src="/auth-illustration.svg"
            alt="Learning illustration"
            className="auth-illustration"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="auth-features">
            <div className="feature-item">
              <span className="feature-icon">📚</span>
              <span>Adaptive Course Content</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💻</span>
              <span>Interactive Code Editor</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>AI-Powered Assistance</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Real-Time Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="auth-right">
        <div className="auth-form-wrapper">

          {/* ── 2FA OTP Step ─────────────────────────────────────────────── */}
          {require2FA ? (
            <div style={{ textAlign: "center" }}>
              <Title level={3} className="auth-title">Two-Factor Authentication</Title>
              <Text type="secondary" className="auth-subtitle">
                Open your authenticator app and enter the 6-digit code
              </Text>
              <div style={{ margin: "32px 0" }}>
                <Input
                  placeholder="000000"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  size="large"
                  style={{ textAlign: "center", fontSize: 28, letterSpacing: 10, width: 220 }}
                  onPressEnter={handle2FAVerify}
                />
              </div>
              <Button
                type="primary"
                loading={loading}
                block
                className="auth-submit-btn"
                onClick={handle2FAVerify}
              >
                Verify
              </Button>
              <Button
                type="text"
                style={{ marginTop: 12, width: "100%" }}
                onClick={() => {
                  setRequire2FA(false);
                  setPendingUserId(null);
                  setOtpValue("");
                  form.resetFields();
                }}
              >
                Back to login
              </Button>
            </div>
          ) : (
          <>
          <Title level={2} className="auth-title">
            {isLogin ? "Welcome Back" : "Create Account"}
          </Title>
          <Text type="secondary" className="auth-subtitle">
            {isLogin
              ? "Sign in to continue your learning journey"
              : "Join SmartLearn Lab AI and start learning"}
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

          {/* Email/Password Form */}
          <Form
            form={form}
            name="auth"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            {!isLogin && (
              <>
                <div className="name-row">
                  <Form.Item
                    name="firstName"
                    rules={[{ required: true, message: "First name required" }]}
                    className="name-field"
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="First Name"
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    rules={[{ required: true, message: "Last name required" }]}
                    className="name-field"
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Last Name"
                    />
                  </Form.Item>
                </div>


              </>
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

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 6, message: "At least 6 characters" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>

            {!isLogin && (
              <Form.Item
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Passwords do not match")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm Password"
                />
              </Form.Item>
            )}

            <Form.Item>
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
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
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