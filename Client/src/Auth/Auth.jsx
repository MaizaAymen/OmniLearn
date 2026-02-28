import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Select,
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

const { Title, Text, Link } = Typography;

const API_URL = "http://localhost:5000/api/auth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    form.resetFields();
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const res = await axios.post(`${API_URL}${endpoint}`, values);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      message.success(isLogin ? "Welcome back!" : "Account created!");
      window.location.href = "/";
    } catch (err) {
      message.error(
        err.response?.data?.message || "Something went wrong"
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
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
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

                <Form.Item
                  name="role"
                  rules={[{ required: true, message: "Select your role" }]}
                >
                  <Select placeholder="I am a...">
                    <Select.Option value="student">Student</Select.Option>
                    <Select.Option value="teacher">Teacher</Select.Option>
                  </Select>
                </Form.Item>
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
        </div>
      </div>
    </div>
  );
};

export default Auth;