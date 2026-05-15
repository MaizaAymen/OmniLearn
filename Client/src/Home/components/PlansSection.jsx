import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPlanPricing } from "../../Admin/planApi";
import { motion } from "framer-motion";
import {
  Rocket,
  Crown,
  Users,
  Check,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const PLANS = [
  {
    key: "free",
    label: "Free",
    tagline: "Start exploring",
    icon: Rocket,
    accent: "slate",
    price: "$0",
    priceSuffix: "forever",
    cta: "Get started",
    features: [
      { text: "Access to first 10 problems", ok: true },
      { text: "Workspace: 3 PDFs & 3 code files", ok: true },
      { text: "3 private message contacts", ok: true },
      { text: "Up to 3 roadmaps", ok: true },
      { text: "Community support", ok: true },
      { text: "AI code correction", ok: false },
      { text: "PDF AI analyzer", ok: false },
      { text: "Classroom access", ok: false },
    ],
  },
  {
    key: "pro",
    label: "Pro",
    tagline: "For serious learners",
    icon: Crown,
    accent: "emerald",
    price: "$9.99",
    priceSuffix: "one-time",
    cta: "Upgrade to Pro",
    badge: "Most popular",
    highlighted: true,
    features: [
      { text: "All problems unlocked", ok: true },
      { text: "AI code correction", ok: true },
      { text: "PDF AI analyzer", ok: true },
      { text: "Workspace: 200 PDFs & 200 code files", ok: true },
      { text: "Up to 20 roadmaps", ok: true },
      { text: "Priority support", ok: true },
      { text: "Classroom access", ok: false },
    ],
  },
  {
    key: "institution",
    label: "Institution",
    tagline: "For schools & teams",
    icon: Users,
    accent: "violet",
    price: "$49.99",
    priceSuffix: "one-time",
    cta: "Get Institution",
    features: [
      { text: "All problems unlocked", ok: true },
      { text: "AI code correction", ok: true },
      { text: "PDF AI analyzer", ok: true },
      { text: "Unlimited workspace", ok: true },
      { text: "Unlimited roadmaps", ok: true },
      { text: "Classroom access", ok: true },
      { text: "Dedicated support", ok: true },
    ],
  },
];

export default function PlansSection() {
  const navigate = useNavigate();
  const [prices, setPrices] = useState({ pro: 999, institution: 4999 });

  useEffect(() => {
    fetchPlanPricing()
      .then((p) => setPrices({ pro: Number(p.pro), institution: Number(p.institution) }))
      .catch(() => {});
  }, []);

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
  const plansWithPrice = PLANS.map((p) => {
    if (p.key === "pro") return { ...p, price: formatPrice(prices.pro) };
    if (p.key === "institution") return { ...p, price: formatPrice(prices.institution) };
    return p;
  });

  return (
    <section className="omni-plans-section" id="pricing">
      <motion.div
        className="omni-section-header omni-plans-header"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="omni-section-eyebrow">
          <Sparkles size={13} /> <span>Pricing</span>
        </div>
        <h2>Pick the plan that grows with you.</h2>
        <p className="omni-plans-sub">
          One-time payment. No subscriptions. Upgrade anytime.
        </p>
      </motion.div>

      <div className="omni-plans-grid">
        {plansWithPrice.map((plan, i) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.key}
              className={`omni-plan omni-plan-${plan.accent} ${
                plan.highlighted ? "omni-plan-featured" : ""
              }`}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.08 + i * 0.1, duration: 0.55 }}
              whileHover={{ y: -6 }}
            >
              {plan.badge && (
                <span className="omni-plan-badge">{plan.badge}</span>
              )}

              <div className="omni-plan-head">
                <div className={`omni-plan-ico omni-plan-ico-${plan.accent}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="omni-plan-title">{plan.label}</div>
                  <div className="omni-plan-tagline">{plan.tagline}</div>
                </div>
              </div>

              <div className="omni-plan-price">
                <span className="omni-plan-price-val">{plan.price}</span>
                <span className="omni-plan-price-suf">{plan.priceSuffix}</span>
              </div>

              <ul className="omni-plan-features">
                {plan.features.map((f, idx) => (
                  <li
                    key={idx}
                    className={f.ok ? "omni-plan-feat-ok" : "omni-plan-feat-no"}
                  >
                    {f.ok ? (
                      <Check size={15} strokeWidth={2.6} />
                    ) : (
                      <X size={15} strokeWidth={2.4} />
                    )}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`omni-plan-cta omni-plan-cta-${plan.accent}`}
                onClick={() => navigate("/auth")}
              >
                {plan.cta}
                <ArrowRight size={15} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
