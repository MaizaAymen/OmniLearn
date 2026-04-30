import React, { useEffect, useState } from "react";
import { Button, Card, Col, Row, Tag, Typography, message } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  CrownOutlined,
  RocketOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Cookies from "js-cookie";
import {
  fetchMyPlan,
  createCheckoutSession,
  verifyStripeSession,
} from "../Admin/planApi";

const { Title, Text } = Typography;

const PLANS = [
  {
    key: "free",
    label: "Free",
    icon: <RocketOutlined style={{ fontSize: 28, color: "#8c8c8c" }} />,
    color: "#8c8c8c",
    bgColor: "#fafafa",
    features: [
      { text: "Access to first 10 problems", ok: true },
      { text: "AI code correction", ok: false },
      { text: "PDF analyzer", ok: false },
      { text: "Classroom access", ok: false },
      { text: "Community support", ok: true },
    ],
    badge: null,
    price: "$0",
    priceLabel: "Free forever",
  },
  {
    key: "pro",
    label: "Pro",
    icon: <CrownOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
    color: "#1677ff",
    bgColor: "#f0f5ff",
    features: [
      { text: "All problems unlocked", ok: true },
      { text: "AI code correction", ok: true },
      { text: "PDF analyzer", ok: true },
      { text: "My Workspace (PDFs & code)", ok: true },
      { text: "Classroom access", ok: false },
      { text: "Priority support", ok: true },
    ],
    badge: "Popular",
    price: "$9.99",
    priceLabel: "one-time",
  },
  {
    key: "institution",
    label: "Institution",
    icon: <TeamOutlined style={{ fontSize: 28, color: "#722ed1" }} />,
    color: "#722ed1",
    bgColor: "#f9f0ff",
    features: [
      { text: "All problems unlocked", ok: true },
      { text: "AI code correction", ok: true },
      { text: "PDF analyzer", ok: true },
      { text: "My Workspace (PDFs & code)", ok: true },
      { text: "Classroom access", ok: true },
      { text: "Dedicated support", ok: true },
    ],
    badge: "Full access",
    price: "$49.99",
    priceLabel: "one-time",
  },
];

const PlanSection = () => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(null);

  const load = () =>
    fetchMyPlan()
      .then(setInfo)
      .catch((e) => message.error(e.message));

  useEffect(() => {
    load();
    // Au retour de Stripe, on vérifie la session et on upgrade le user.
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_session");
    const cancelled = params.get("stripe_cancelled");
    if (sessionId) {
      verifyStripeSession(sessionId)
        .then((res) => {
          const user = JSON.parse(Cookies.get("user") || "{}");
          Cookies.set("user", JSON.stringify({ ...user, plan: res.plan }));
          message.success(`Welcome to ${res.plan}!`);
          window.history.replaceState({}, "", window.location.pathname);
          load();
          setTimeout(() => window.location.reload(), 800);
        })
        .catch((e) => message.error(e.message));
    } else if (cancelled) {
      message.info("Payment cancelled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const onCheckout = async (plan) => {
    try {
      setLoading(plan);
      const { url } = await createCheckoutSession(plan);
      window.location.href = url;
    } catch (err) {
      message.error(err.message);
      setLoading(null);
    }
  };

  const currentPlan = info?.plan || "free";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">
          You are currently on the{" "}
          <Text strong style={{ textTransform: "capitalize" }}>
            {currentPlan}
          </Text>{" "}
          plan. Compare plans below to see what's available.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <Col xs={24} md={8} key={plan.key}>
              <Card
                style={{
                  borderRadius: 12,
                  border: `2px solid ${isCurrent ? plan.color : "#f0f0f0"}`,
                  background: isCurrent ? plan.bgColor : "#fff",
                  height: "100%",
                  position: "relative",
                  transition: "box-shadow 0.2s",
                  boxShadow: isCurrent ? `0 4px 16px ${plan.color}22` : "none",
                }}
                styles={{ body: { padding: 24 } }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      right: 16,
                      background: plan.color,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "0 0 8px 8px",
                      letterSpacing: 0.5,
                    }}
                  >
                    CURRENT PLAN
                  </div>
                )}

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  {plan.icon}
                  <Title level={4} style={{ margin: "8px 0 4px", color: plan.color }}>
                    {plan.label}
                  </Title>
                  {plan.badge && !isCurrent && (
                    <Tag
                      color={plan.key === "pro" ? "blue" : "purple"}
                      style={{ fontSize: 11 }}
                    >
                      {plan.badge}
                    </Tag>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: plan.color,
                      }}
                    >
                      {plan.price}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                      {plan.priceLabel}
                    </Text>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  {plan.features.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 0",
                        borderBottom:
                          i < plan.features.length - 1 ? "1px solid #f5f5f5" : "none",
                      }}
                    >
                      {f.ok ? (
                        <CheckOutlined
                          style={{ color: "#52c41a", fontSize: 13, flexShrink: 0 }}
                        />
                      ) : (
                        <CloseOutlined
                          style={{ color: "#bfbfbf", fontSize: 13, flexShrink: 0 }}
                        />
                      )}
                      <Text
                        style={{
                          fontSize: 13,
                          color: f.ok ? "#262626" : "#bfbfbf",
                        }}
                      >
                        {f.text}
                      </Text>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center" }}>
                  {isCurrent ? (
                    <Button block disabled style={{ borderRadius: 8 }}>
                      Current Plan
                    </Button>
                  ) : plan.key === "pro" && currentPlan === "free" ? (
                    <Button
                      type="primary"
                      block
                      loading={loading === "pro"}
                      onClick={() => onCheckout("pro")}
                      style={{
                        borderRadius: 8,
                        background: plan.color,
                        borderColor: plan.color,
                      }}
                    >
                      Upgrade to Pro — $9.99
                    </Button>
                  ) : plan.key === "institution" && currentPlan !== "institution" ? (
                    <Button
                      type="primary"
                      block
                      loading={loading === "institution"}
                      onClick={() => onCheckout("institution")}
                      style={{
                        borderRadius: 8,
                        background: plan.color,
                        borderColor: plan.color,
                      }}
                    >
                      Upgrade to Institution — $49.99
                    </Button>
                  ) : null}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default PlanSection;
