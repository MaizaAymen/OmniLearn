import React, { useState, useCallback } from "react";
import { ReactFlow, ReactFlowProvider, Controls, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Input, Button, Card, Typography, Space, Spin, Alert, theme } from "antd";
import { LoadingOutlined, ShareAltOutlined } from "@ant-design/icons";
import dagre from "dagre";

const { Title, Text } = Typography;
const { useToken } = theme;

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedNodes = (nodes, edges, direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, ranker: "network-simplex", marginx: 50, marginy: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: node.width || 172, height: node.height || 36 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: { x: nodeWithPosition.x - (node.width || 172) / 2, y: nodeWithPosition.y - (node.height || 36) / 2 },
    };
  });
};

const Roadmaps = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useToken();

  const generateRoadmap = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/ai/ai/generate/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error("Failed to generate roadmap");
      const data = await res.json();

      // Apply vertical layout
      const layoutedNodes = getLayoutedNodes(data.nodes || [], data.edges || [], "TB");

      // Enhance nodes with colorful styles
      const styledNodes = layoutedNodes.map((node, index) => ({
        ...node,
        style: {
          background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorSuccess} 100%)`,
          color: "#fff",
          border: "none",
          borderRadius: token.borderRadiusLG,
          padding: 10,
          boxShadow: token.boxShadow,
          fontWeight: 500,
        },
      }));

      // Style edges with theme color
      const styledEdges = (data.edges || []).map((edge) => ({
        ...edge,
        style: { stroke: token.colorPrimary, strokeWidth: 2 },
        animated: true,
      }));

      setNodes(styledNodes);
      setEdges(styledEdges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") generateRoadmap();
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      padding: token.paddingLG,
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: token.marginXL }}>
          <Title level={1} style={{ 
            background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorSuccess} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: token.marginXS,
          }}>
            Interactive Roadmap Generator
          </Title>
          <Text type="secondary" style={{ fontSize: token.fontSizeLG }}>
            Enter any topic and let AI create a visual learning path for you
          </Text>
        </div>

        {/* Input Section */}
        <Card 
          bordered={false} 
          style={{ 
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadow,
            marginBottom: token.marginXL,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Space.Compact style={{ width: "100%" }}>
            <Input
              size="large"
              placeholder="e.g., Machine Learning, Web Development, Digital Marketing..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              style={{ fontSize: token.fontSizeLG }}
            />
            <Button 
              type="primary" 
              size="large"
              onClick={generateRoadmap}
              loading={loading}
              icon={<ShareAltOutlined />}
              style={{ 
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorSuccess} 100%)`,
                border: "none",
              }}
            >
              Generate Roadmap
            </Button>
          </Space.Compact>
          {error && (
            <Alert 
              message="Error" 
              description={error} 
              type="error" 
              showIcon 
              style={{ marginTop: token.marginMD }}
            />
          )}
        </Card>

        {/* Flowchart Section */}
        <Card 
          title={
            <Space>
              <span style={{ 
                display: "inline-block", 
                width: 12, 
                height: 12, 
                borderRadius: "50%", 
                background: token.colorPrimary,
                marginRight: 8,
              }} />
              <Text strong>Generated Roadmap (Vertical Layout)</Text>
              {nodes.length > 0 && (
                <Text type="secondary" style={{ marginLeft: token.marginXS }}>
                  ({nodes.length} nodes, {edges.length} connections)
                </Text>
              )}
            </Space>
          }
          bordered={false}
          style={{ 
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadow,
            overflow: "hidden",
          }}
          headStyle={{ 
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ position: "relative", width: "100%", height: 600 }}>
            {loading && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                backdropFilter: "blur(3px)",
              }}>
                <Spin 
                  indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} 
                  tip="Generating your roadmap..."
                />
              </div>
            )}
            <ReactFlowProvider>
              <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                fitView
                attributionPosition="bottom-left"
              >
                <Background color="#aaa" gap={16} />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
          {nodes.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: token.paddingXXL }}>
              <Text type="secondary">No roadmap generated yet. Enter a topic above to start.</Text>
            </div>
          )}
        </Card>

        {/* Footer Stats */}
        {nodes.length > 0 && (
          <div style={{ 
            marginTop: token.marginLG, 
            display: "flex", 
            justifyContent: "center",
            gap: token.marginMD,
          }}>
            <Card size="small" style={{ textAlign: "center" }}>
              <Text type="secondary">Nodes</Text>
              <div style={{ fontSize: token.fontSizeHeading3, fontWeight: "bold", color: token.colorPrimary }}>
                {nodes.length}
              </div>
            </Card>
            <Card size="small" style={{ textAlign: "center" }}>
              <Text type="secondary">Edges</Text>
              <div style={{ fontSize: token.fontSizeHeading3, fontWeight: "bold", color: token.colorSuccess }}>
                {edges.length}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roadmaps;