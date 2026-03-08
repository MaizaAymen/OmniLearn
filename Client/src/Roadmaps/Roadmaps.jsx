import React from "react";
import { ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const Roadmaps = () => {
  const nodes = [
    { id: "1", position: { x: 0, y: 0 }, data: { label: "HTML" } },
    { id: "2", position: { x: 200, y: 100 }, data: { label: "CSS" } },
  ];

  const edges = [
    { id: "e1-2", source: "1", target: "2" },
  ];

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
};

export default Roadmaps;