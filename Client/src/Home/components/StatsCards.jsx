import React from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Award, TrendingUp } from "lucide-react";

const STATS = [
  {
    label: "Problems Solved",
    value: "247",
    change: "+12 this week",
    icon: Trophy,
    color: "emerald",
    trend: "up",
  },
  {
    label: "Current Streak",
    value: "18",
    change: "days in a row",
    icon: Flame,
    color: "orange",
    trend: "up",
  },
  {
    label: "Ranking",
    value: "#1,284",
    change: "Top 5% globally",
    icon: Award,
    color: "violet",
    trend: "up",
  },
];

export default function StatsCards() {
  return (
    <section className="omni-stats-section">
      <motion.div
        className="omni-section-header"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="omni-section-eyebrow">
          <TrendingUp size={13} /> <span>Your stats</span>
        </div>
        <h2>Progress at a glance.</h2>
      </motion.div>
      <div className="omni-stats-grid">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="omni-stat"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
            whileHover={{ y: -4 }}
          >
            <div className={`omni-stat-ico omni-stat-ico-${s.color}`}>
              <s.icon size={20} />
            </div>
            <div className="omni-stat-content">
              <div className="omni-stat-val">{s.value}</div>
              <div className="omni-stat-lbl">{s.label}</div>
              <div className="omni-stat-chg">{s.change}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
