"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile } from "@/src/parser/types";
import { FoldedNodeComponent } from "./folded-node";
import { OpenPanelComponent } from "./open-panel";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderOpen,
  Layers,
  Sparkles,
} from "lucide-react";

interface MapCanvasProps {
  nodes: FoldedNode[];
  edges: NodeEdge[];
  rawEdges: Array<{ source: string; target: string; kind?: string }>;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectFile: (file: ParsedFile | null) => void;
}

export function MapCanvas({
  nodes,
  edges,
  rawEdges,
  selectedNodeId,
  selectedFilePath,
  onSelectNode,
  onSelectFile,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set of opened folder node IDs
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());

  // Viewport transform state: Pan and Zoom
  const [transform, setTransform] = useState({ x: 60, y: 40, scale: 0.85 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Map of file path to its parent folded node ID
  const fileToNodeMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((n) => {
      n.files.forEach((f) => map.set(f.path, n.id));
    });
    return map;
  }, [nodes]);

  // Map of node ID to FoldedNode
  const nodeMap = useMemo(() => {
    const map = new Map<string, FoldedNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Toggle open/closed panel
  const toggleNodeOpen = useCallback((nodeId: string) => {
    setOpenNodeIds((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(nodeId);

      if (wasOpen) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);

        // Refit rule: "Opening a folder refits the view so the new panel is visible.
        // Refitting on open may only ever zoom out, never in."
        setTimeout(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const targetNode = nodeMap.get(nodeId);
            if (targetNode) {
              setTransform((current) => {
                // Check if target panel would exceed viewport boundaries
                const panelWidth = 300;
                const panelHeight = 360;
                const nodeScreenX = targetNode.x * current.scale + current.x;
                const nodeScreenY = targetNode.y * current.scale + current.y;

                let newScale = current.scale;
                let newX = current.x;
                let newY = current.y;

                if (
                  nodeScreenX + panelWidth * current.scale > rect.width - 40 ||
                  nodeScreenY + panelHeight * current.scale > rect.height - 40 ||
                  nodeScreenX < 40 ||
                  nodeScreenY < 40
                ) {
                  // Only ever zoom out, never in
                  const zoomFactor = Math.min(
                    1,
                    (rect.width * 0.8) / (panelWidth + Math.abs(targetNode.x - rect.width / 2)),
                    (rect.height * 0.8) / (panelHeight + Math.abs(targetNode.y - rect.height / 2))
                  );
                  newScale = Math.min(current.scale, Math.max(0.4, current.scale * zoomFactor));
                }

                return { x: newX, y: newY, scale: newScale };
              });
            }
          }
        }, 50);
      }
      return next;
    });
  }, [nodeMap]);

  // Fit view calculation
  const handleFitView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const scale = Math.max(0.4, Math.min(1.0, Math.min(scaleX, scaleY)));

    const x = (rect.width - graphWidth * scale) / 2 - minX * scale + 80 * scale;
    const y = (rect.height - graphHeight * scale) / 2 - minY * scale + 80 * scale;

    setTransform({ x, y, scale });
  }, [nodes]);

  // Initial fit view on mount
  useEffect(() => {
    handleFitView();
  }, [handleFitView]);

  // Pan interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Primary click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom interaction via mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => {
      const newScale = Math.max(0.3, Math.min(2.0, prev.scale * zoomFactor));
      return { ...prev, scale: newScale };
    });
  };

  // Compute Active/Dimmed State:
  // "Selecting either one keeps it, its edges, and whatever those edges connect to at full strength, and dims everything else."
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    if (!selectedNodeId && !selectedFilePath) {
      return {
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
      };
    }

    const activeNodes = new Set<string>();
    const activeEdges = new Set<string>();

    if (selectedFilePath) {
      const parentNode = fileToNodeMap.get(selectedFilePath);
      if (parentNode) activeNodes.add(parentNode);

      // Match raw edges connected to selectedFilePath
      rawEdges.forEach((re) => {
        if (re.source === selectedFilePath || re.target === selectedFilePath) {
          const srcNode = fileToNodeMap.get(re.source);
          const tgtNode = fileToNodeMap.get(re.target);
          if (srcNode) activeNodes.add(srcNode);
          if (tgtNode) activeNodes.add(tgtNode);
          if (srcNode && tgtNode) activeEdges.add(`${srcNode}->${tgtNode}`);
        }
      });
    } else if (selectedNodeId) {
      activeNodes.add(selectedNodeId);
      edges.forEach((e) => {
        if (e.sourceNodeId === selectedNodeId || e.targetNodeId === selectedNodeId) {
          activeNodes.add(e.sourceNodeId);
          activeNodes.add(e.targetNodeId);
          activeEdges.add(e.id);
        }
      });
    }

    return {
      highlightedNodeIds: activeNodes,
      highlightedEdgeIds: activeEdges,
    };
  }, [selectedNodeId, selectedFilePath, edges, rawEdges, fileToNodeMap]);

  const hasSelection = Boolean(selectedNodeId || selectedFilePath);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`flex-1 h-full relative overflow-hidden bg-zinc-950 select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* 1. Canvas Top Status Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-xl">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Interactive Canvas</span>
        </span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400 font-mono text-[11px]">
          {nodes.length} folded nodes • {openNodeIds.size} open panels • {edges.length} inter-module edges
        </span>
      </div>

      {/* 2. Floating Zoom & View Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 backdrop-blur-md p-1 rounded-lg text-zinc-300 shadow-xl">
        <button
          type="button"
          onClick={() =>
            setTransform((p) => ({ ...p, scale: Math.min(2.0, p.scale * 1.15) }))
          }
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setTransform((p) => ({ ...p, scale: Math.max(0.3, p.scale * 0.85) }))
          }
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          type="button"
          onClick={handleFitView}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="px-2 text-[10px] font-mono text-zinc-500 border-l border-zinc-800">
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

      {/* 3. Infinite Viewport Stage */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          transform: `translate(${transform.x % 28}px, ${transform.y % 28}px)`,
        }}
      />

      <div
        className="w-full h-full relative"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* SVG Edges Layer */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          style={{ width: "2400px", height: "1600px" }}
        >
          <defs>
            <marker
              id="edge-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(148, 163, 184, 0.6)" />
            </marker>
            <marker
              id="edge-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const src = nodeMap.get(edge.sourceNodeId);
            const tgt = nodeMap.get(edge.targetNodeId);
            if (!src || !tgt) return null;

            const isEdgeActive = highlightedEdgeIds.has(edge.id);
            const isEdgeDimmed = hasSelection && !isEdgeActive;

            const isOpenSrc = openNodeIds.has(src.id);
            const isOpenTgt = openNodeIds.has(tgt.id);

            // Calculate anchor centers
            const srcWidth = isOpenSrc ? 300 : src.width;
            const srcHeight = isOpenSrc ? 280 : src.height;
            const tgtWidth = isOpenTgt ? 300 : tgt.width;
            const tgtHeight = isOpenTgt ? 280 : tgt.height;

            const x1 = src.x + srcWidth / 2;
            const y1 = src.y + srcHeight / 2;
            const x2 = tgt.x + tgtWidth / 2;
            const y2 = tgt.y + tgtHeight / 2;

            // Smooth cubic bezier path
            const dx = x2 - x1;
            const dy = y2 - y1;
            const curve = Math.min(100, Math.max(40, Math.hypot(dx, dy) * 0.25));
            const pathD = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;

            return (
              <path
                key={edge.id}
                d={pathD}
                fill="none"
                stroke={isEdgeActive ? "#3b82f6" : "rgba(113, 113, 122, 0.45)"}
                strokeWidth={isEdgeActive ? 2.5 : Math.min(2.5, Math.max(1.2, edge.count * 0.4))}
                strokeDasharray={isEdgeActive ? "none" : undefined}
                markerEnd={isEdgeActive ? "url(#edge-arrow-active)" : "url(#edge-arrow)"}
                opacity={isEdgeDimmed ? 0.08 : 1}
                className="transition-all duration-200"
              />
            );
          })}
        </svg>

        {/* Nodes Layer: Folded Nodes & Open Panels */}
        {nodes.map((node) => {
          const isOpen = openNodeIds.has(node.id);
          const isNodeSelected = selectedNodeId === node.id;
          const isNodeHighlighted = highlightedNodeIds.has(node.id);
          const isDimmed = hasSelection && !isNodeHighlighted && !isNodeSelected;

          return (
            <div
              key={node.id}
              onWheel={(e) => {
                if (isOpen) e.stopPropagation();
              }}
              onMouseDown={(e) => {
                if (isOpen) e.stopPropagation();
              }}
              style={{
                position: "absolute",
                left: `${node.x}px`,
                top: `${node.y}px`,
                zIndex: isOpen ? 30 : isNodeSelected ? 20 : 10,
              }}
            >
              {isOpen ? (
                <OpenPanelComponent
                  node={node}
                  selectedFilePath={selectedFilePath}
                  isSelectedNode={isNodeSelected}
                  isDimmed={isDimmed}
                  onClose={() => toggleNodeOpen(node.id)}
                  onSelectNode={() => {
                    onSelectNode(node.id);
                    onSelectFile(null);
                  }}
                  onSelectFile={(file) => {
                    onSelectFile(file);
                    onSelectNode(null);
                  }}
                />
              ) : (
                <FoldedNodeComponent
                  node={node}
                  isSelected={isNodeSelected}
                  isDimmed={isDimmed}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.id);
                    onSelectFile(null);
                  }}
                  onOpen={(e) => {
                    e.stopPropagation();
                    toggleNodeOpen(node.id);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

