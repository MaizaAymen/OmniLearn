import { useMemo, useState } from "react";
import { Card, Col, Empty, Row, Tooltip, Typography, Space } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Text, Title } = Typography;

const LEVELS = ["#f0f0f0", "#b7eb8f", "#73d13d", "#389e0d", "#135200"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const WEEKS = 53;
const CELL = 13;
const GAP = 3;
const UNIT = CELL + GAP;

const LANG_COLORS = {
  python: "#1677ff",
  javascript: "#fa8c16",
  js: "#fa8c16",
  typescript: "#2f54eb",
  ts: "#2f54eb",
  "c++": "#722ed1",
  cpp: "#722ed1",
  c: "#13c2c2",
  java: "#cf1322",
  go: "#08979c",
  rust: "#a8071a",
  unknown: "#8c8c8c",
};

const DIFF_COLORS = { Easy: "#389e0d", Medium: "#d46b08", Hard: "#a8071a" };

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function calcStreaks(activity) {
  const today = new Date();
  let current = 0;
  let longest = 0;
  let temp = 0;

  const keys = Object.keys(activity).sort();
  for (const key of keys) {
    if (activity[key] > 0) {
      temp++;
      if (temp > longest) longest = temp;
    } else {
      temp = 0;
    }
  }

  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    if (activity[key] > 0) current++;
    else if (i === 0) continue;
    else break;
  }
  return { current, longest };
}

function StatCard({ label, value, unit, icon, iconColor }) {
  return (
    <Card
      style={{ borderRadius: 12, background: "#fafaf8", border: "1px solid #f0ece0" }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3, margin: "4px 0" }}>
        {value}{" "}
        {icon && <span style={{ fontSize: 20, color: iconColor }}>{icon}</span>}
      </div>
      <Text type="secondary" style={{ fontSize: 13 }}>{unit}</Text>
    </Card>
  );
}

function SubmissionHeatmap({ activity }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const year = new Date().getFullYear();
  const total = useMemo(
    () => Object.values(activity).reduce((a, b) => a + b, 0),
    [activity]
  );

  const grid = useMemo(() => {
    const firstCell = new Date(year, 0, 1);
    const dow = firstCell.getDay();
    firstCell.setDate(firstCell.getDate() - (dow === 0 ? 6 : dow - 1));
    const weeks = [];
    for (let w = 0; w < WEEKS; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(firstCell);
        date.setDate(firstCell.getDate() + w * 7 + d);
        const key = localDateKey(date);
        week.push({
          date,
          key,
          count: activity[key] || 0,
          isCurrentYear: date.getFullYear() === year,
          isFuture: date > new Date(),
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [activity, year]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    grid.forEach((week, wi) => {
      const first = week.find((d) => d.isCurrentYear && !d.isFuture);
      if (first) {
        const m = first.date.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          labels.push({ month: MONTHS[m], x: wi });
        }
      }
    });
    return labels;
  }, [grid]);

  const svgW = WEEKS * UNIT + 32;
  const svgH = 7 * UNIT + 24;

  return (
    <Card
      style={{ borderRadius: 12, border: "1px solid #f0ece0" }}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Daily submissions — {year}</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {total.toLocaleString()} total submissions
        </Text>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
          <g transform="translate(28,20)">
            {monthLabels.map(({ month, x }) => (
              <text key={`${month}-${x}`} x={x * UNIT} y={-6} fontSize={10} fill="#8c8c8c">
                {month}
              </text>
            ))}
            {DAY_LABELS.map((label, i) =>
              label ? (
                <text key={i} x={-4} y={i * UNIT + CELL - 1} fontSize={9} textAnchor="end" fill="#8c8c8c">
                  {label}
                </text>
              ) : null
            )}
            {grid.map((week, wi) =>
              week.map((day, di) => {
                const inactive = !day.isCurrentYear || day.isFuture;
                const level = getLevel(day.count);
                const isHovered = hoveredKey === day.key;
                const tooltipContent = (
                  <span style={{ fontSize: 12 }}>
                    <strong>{day.count} submission{day.count !== 1 ? "s" : ""}</strong>
                    <br />
                    {day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                );
                return (
                  <Tooltip key={day.key} title={inactive ? null : tooltipContent} placement="top">
                    <rect
                      x={wi * UNIT}
                      y={di * UNIT}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={inactive ? "#f5f5f5" : LEVELS[level]}
                      opacity={inactive ? 0.35 : isHovered ? 0.7 : 1}
                      style={{ cursor: inactive ? "default" : "pointer", transition: "opacity 0.12s" }}
                      onMouseEnter={() => !inactive && setHoveredKey(day.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                    />
                  </Tooltip>
                );
              })
            )}
          </g>
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>Less</Text>
        {LEVELS.map((color, i) => (
          <span
            key={i}
            style={{
              width: 11,
              height: 11,
              borderRadius: 2,
              background: color,
              border: "0.5px solid rgba(0,0,0,0.1)",
              display: "inline-block",
            }}
          />
        ))}
        <Text type="secondary" style={{ fontSize: 11 }}>More</Text>
      </div>
    </Card>
  );
}

function DifficultyChart({ breakdown }) {
  const data = ["Easy", "Medium", "Hard"].map((name) => ({
    name,
    count: breakdown?.[name] || 0,
    color: DIFF_COLORS[name],
  }));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card
      style={{ borderRadius: 12, border: "1px solid #f0ece0", height: "100%" }}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <Title level={5} style={{ margin: "0 0 8px" }}>Difficulty breakdown</Title>
      <Space size={12} style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {data.map((d) => (
          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#595959" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
            {d.name} {d.count}
          </span>
        ))}
      </Space>
      {total === 0 ? (
        <Empty description="No solved problems yet" style={{ padding: "32px 0" }} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#8c8c8c" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8c8c8c" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RechartTooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 13 }}
              formatter={(value) => [`${value} solved`, ""]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function LanguageChart({ breakdown }) {
  const data = useMemo(() => {
    const entries = Object.entries(breakdown || {}).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (!total) return [];
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round((count / total) * 100),
        count,
        color: LANG_COLORS[name] || "#8c8c8c",
      }));
  }, [breakdown]);

  return (
    <Card
      style={{ borderRadius: 12, border: "1px solid #f0ece0", height: "100%" }}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <Title level={5} style={{ margin: "0 0 8px" }}>Language usage</Title>
      <Space size={12} style={{ marginBottom: 4, flexWrap: "wrap" }}>
        {data.map((d) => (
          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#595959" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
            {d.name} {d.value}%
          </span>
        ))}
      </Space>
      {data.length === 0 ? (
        <Empty description="No submissions yet" style={{ padding: "32px 0" }} />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2} dataKey="value">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RechartTooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 13 }}
              formatter={(value, name) => [`${value}%`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default function CodingDashboard({ activity = {}, languageBreakdown = {}, difficultyBreakdown = {}, stats = {} }) {
  const { current, longest } = useMemo(() => calcStreaks(activity), [activity]);
  const activeDays = useMemo(() => Object.values(activity).filter((c) => c > 0).length, [activity]);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Current streak" value={current} unit="days" icon="🔥" iconColor="#fa541c" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Longest streak" value={longest} unit="days" icon={<ThunderboltOutlined />} iconColor="#faad14" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Total solved" value={stats.solved || 0} unit="problems" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Active days" value={activeDays} unit="this year" />
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <SubmissionHeatmap activity={activity} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <DifficultyChart breakdown={difficultyBreakdown} />
        </Col>
        <Col xs={24} md={12}>
          <LanguageChart breakdown={languageBreakdown} />
        </Col>
      </Row>
    </div>
  );
}
