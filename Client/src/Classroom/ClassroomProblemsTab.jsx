import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, Popconfirm, Space, Table, Tag, message } from "antd";
import { DeleteOutlined, PlusOutlined, RobotOutlined } from "@ant-design/icons";
import Cookies from "js-cookie";

const API = "http://localhost:5000/api/ai/ai";
const DIFF_COLOR = { Easy: "green", Medium: "orange", Hard: "red" };

const authHeaders = (json = false) => {
  const token = Cookies.get("token");
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

export default function ClassroomProblemsTab({ classId, onBankChanged }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/getallproblems?classId=${classId}`, { headers: authHeaders() });
      const data = res.ok ? await res.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId]);

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/deletepromblem/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      message.success("Removed from classroom");
      load();
      onBankChanged?.();
    } catch {
      message.error("Failed to delete");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 13, maxWidth: 560 }}>
          Problems you create here stay private to this classroom. Forking from the global bank
          (<a href="/problems" style={{ color: "#111827", fontWeight: 600 }}>/problems</a>) also drops them here automatically.
        </div>
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => navigate(`/problems/create?classId=${classId}`)}
          >
            Create manually
          </Button>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={() => navigate(`/problems/create?classId=${classId}&tab=ai`)}
          >
            Generate with AI
          </Button>
        </Space>
      </div>

      {!loading && items.length === 0 ? (
        <Empty
          description={
            <span>
              No classroom problems yet — create one above, or fork from{" "}
              <a href="/problems" style={{ color: "#111827", fontWeight: 600 }}>/problems</a>.
            </span>
          }
          style={{ padding: "40px 0" }}
        />
      ) : (
        <Table
          loading={loading}
          dataSource={items}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: "Title",
              dataIndex: "title",
              render: (t, r) => (
                <Space direction="vertical" size={0}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{r.category}</span>
                  {r.forkedFrom && <Tag style={{ fontSize: 10 }}>fork of {r.forkedFrom}</Tag>}
                </Space>
              ),
            },
            {
              title: "Difficulty",
              dataIndex: "difficulty",
              width: 100,
              render: (d) => <Tag color={DIFF_COLOR[d]}>{d}</Tag>,
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 100,
              render: (s) => <Tag color={s === "published" ? "green" : "orange"}>{s}</Tag>,
            },
            {
              title: "",
              key: "action",
              width: 60,
              render: (_, r) => (
                <Popconfirm
                  title="Remove this problem from the classroom?"
                  onConfirm={() => handleDelete(r.id)}
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
