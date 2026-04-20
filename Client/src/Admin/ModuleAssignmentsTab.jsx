import React, { useEffect, useState } from "react";
import {
  Card, Button, Form, Input, InputNumber, DatePicker, Checkbox,
  List, Tag, Popconfirm, Modal, Progress, Empty, message, Select, Space,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const API = "http://localhost:5000/api";

const diffColor = (d) =>
  d === "Easy" ? "green" : d === "Medium" ? "gold" : "red";

const ModuleAssignmentsTab = ({ moduleId }) => {
  const [assignments, setAssignments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [autoDifficulty, setAutoDifficulty] = useState(null);
  const [selectedPids, setSelectedPids] = useState([]);
  const [form] = Form.useForm();

  const [statsAssignment, setStatsAssignment] = useState(null);
  const [statsData, setStatsData] = useState(null);

  const loadAssignments = async () => {
    if (!moduleId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/assignments/module/${moduleId}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const loadProblems = async () => {
    try {
      const res = await fetch(`${API}/ai/ai/getallproblems`);
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [moduleId]);

  useEffect(() => {
    loadProblems();
  }, []);

  // Auto-select all problems of the chosen difficulty
  useEffect(() => {
    if (!autoDifficulty) return;
    setSelectedPids(
      problems.filter((p) => p.difficulty === autoDifficulty).map((p) => p.id)
    );
  }, [autoDifficulty, problems]);

  const openCreate = () => {
    form.resetFields();
    setSelectedPids([]);
    setAutoDifficulty(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (selectedPids.length === 0) {
        message.error("Select at least one problem");
        return;
      }
      const res = await fetch(`${API}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          title: values.title,
          problemIds: selectedPids,
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          maxAttempts: values.maxAttempts || null,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("Assignment created");
      setCreateOpen(false);
      loadAssignments();
    } catch (err) {
      if (err?.errorFields) return; // validation error, ignore
      message.error("Failed to create");
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/assignments/${id}`, { method: "DELETE" });
      message.success("Deleted");
      loadAssignments();
    } catch {
      message.error("Failed to delete");
    }
  };

  const openStats = async (a) => {
    setStatsAssignment(a);
    try {
      const res = await fetch(`${API}/assignments/${a.id}/stats`);
      setStatsData(await res.json());
    } catch {
      message.error("Failed to load stats");
    }
  };

  const filteredProblems = autoDifficulty
    ? problems.filter((p) => p.difficulty === autoDifficulty)
    : problems;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#202124" }}>
            Problem Assignments
          </div>
          <div style={{ fontSize: 12, color: "#5f6368", marginTop: 2 }}>
            Coding practice sets for this module
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New Assignment
        </Button>
      </div>

      {/* List */}
      {assignments.length === 0 && !loading ? (
        <Empty description="No assignments yet" style={{ padding: "40px 0" }} />
      ) : (
        <List
          loading={loading}
          dataSource={assignments}
          split={false}
          renderItem={(a) => {
            const overdue = a.dueDate && dayjs(a.dueDate).isBefore(dayjs());
            return (
              <Card
                key={a.id}
                size="small"
                style={{ marginBottom: 10, borderRadius: 8 }}
                bodyStyle={{ padding: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                    <Space size={6} wrap style={{ marginTop: 6 }}>
                      <Tag>{a.problemIds?.length || 0} problems</Tag>
                      {a.dueDate && (
                        <Tag color={overdue ? "red" : "blue"}>
                          Due {dayjs(a.dueDate).format("MMM D, YYYY")}
                        </Tag>
                      )}
                      {a.maxAttempts && <Tag color="purple">Max {a.maxAttempts} attempts</Tag>}
                    </Space>
                  </div>
                  <Space>
                    <Button size="small" icon={<BarChartOutlined />} onClick={() => openStats(a)}>
                      Stats
                    </Button>
                    <Popconfirm
                      title="Delete this assignment?"
                      onConfirm={() => handleDelete(a.id)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            );
          }}
        />
      )}

      {/* Create Modal */}
      <Modal
        title="Create Assignment"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Create"
        width={620}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g. Week 1 — Arrays Practice" />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="dueDate" label="Due Date (optional)">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="maxAttempts" label="Max Attempts (optional)">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="Unlimited" />
            </Form.Item>
          </div>

          <Form.Item label="Auto-pick by difficulty">
            <Select
              placeholder="Manual selection"
              allowClear
              value={autoDifficulty}
              onChange={setAutoDifficulty}
              options={[
                { label: "Easy", value: "Easy" },
                { label: "Medium", value: "Medium" },
                { label: "Hard", value: "Hard" },
              ]}
            />
          </Form.Item>

          <Form.Item label={`Problems — ${selectedPids.length} selected`}>
            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid #e8eaed",
                borderRadius: 6,
                padding: 8,
                background: "#fafafa",
              }}
            >
              {filteredProblems.length === 0 && (
                <div style={{ color: "#999", fontSize: 12, padding: 8 }}>No problems found</div>
              )}
              <Checkbox.Group
                value={selectedPids}
                onChange={setSelectedPids}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }} size={4}>
                  {filteredProblems.map((p) => (
                    <Checkbox key={p.id} value={p.id} style={{ width: "100%" }}>
                      <span style={{ marginRight: 8 }}>{p.title}</span>
                      <Tag color={diffColor(p.difficulty)} style={{ marginLeft: "auto" }}>
                        {p.difficulty}
                      </Tag>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stats Modal */}
      <Modal
        title={statsAssignment ? `Stats — ${statsAssignment.title}` : "Stats"}
        open={!!statsAssignment}
        onCancel={() => { setStatsAssignment(null); setStatsData(null); }}
        footer={null}
        width={520}
      >
        {statsAssignment && statsData && (
          <div>
            {statsAssignment.problemIds.map((pid) => {
              const prob = problems.find((p) => p.id === pid);
              const count = statsData.countByProblem?.[pid] ?? 0;
              const max = Math.max(...Object.values(statsData.countByProblem || {}), 1);
              return (
                <div key={pid} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{prob?.title || pid}</span>
                    <span style={{ color: "#1a73e8", fontWeight: 600 }}>{count} solved</span>
                  </div>
                  <Progress percent={Math.round((count / max) * 100)} showInfo={false} size="small" />
                </div>
              );
            })}
            {statsAssignment.problemIds.length === 0 && (
              <Empty description="No problems in this assignment" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModuleAssignmentsTab;
