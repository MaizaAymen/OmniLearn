import React, { useEffect, useRef } from "react";
import { Graph, Shape } from "@antv/x6";

export default function Uml() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Create Graph (canvas)
    const graph = new Graph({
      container: containerRef.current,
      width: 800,
      height: 600,
      grid: true,
      selecting: true,
    });

    // Add UML class rectangle
    const class1 = graph.addNode({
      shape: 'rect',
      x: 50,
      y: 50,
      width: 150,
      height: 100,
      attrs: {
        body: {
          fill: '#ffffff',
          stroke: '#000000',
        },
        label: {
          text: 'User\n- id: int\n+ login()',
          fill: '#000000',
        },
      },
    });

    // Add second class
    const class2 = graph.addNode({
      shape: 'rect',
      x: 300,
      y: 200,
      width: 150,
      height: 100,
      attrs: {
        body: { fill: '#fff', stroke: '#000' },
        label: { text: 'Admin\n- role: string', fill: '#000' },
      },
    });

    // Connect them
    graph.addEdge({
      source: class1,
      target: class2,
      attrs: { line: { stroke: '#000', strokeWidth: 2 } },
    });
  }, []);

  return (
    <div>
      <h2>UML Editor</h2>
      <div
        ref={containerRef}
        style={{ border: '1px solid #ccc', width: '800px', height: '600px' }}
      />
    </div>
  );
}