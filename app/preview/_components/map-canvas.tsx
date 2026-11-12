"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile, ParserOutput } from "@/src/parser/types";
import { getFileCategoryId } from "@/src/scaffolding/categories";
import { FoldedNodeComponent } from "./folded-node";
import { OpenPanelComponent } from "./open-panel";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  Hand,
  Move,
} from "lucide-react";

interface MapCanvasProps {
  nodes: FoldedNode[];
  edges: NodeEdge[];
  rawEdges: Array<{ source: string; target: string; kind?: string }>;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  selectedCategoryId?: string | null;
  activeTraversalSteps?: Array<{ path: string; depth: number; via: string }> | null;
  activeCyclePaths?: string[] | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectFile: (file: ParsedFile | null) => void;
  onUpdateData?: (newData: ParserOutput) => void;
  hoveredNeighbourPath?: string | null;
  onHoverPath?: (path: string | null) => void;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 3.0;

export function MapCanvas({
  nodes,
  edges,
  rawEdges,
  selectedNodeId,
  selectedFilePath,
  selectedCategoryId,
  activeTraversalSteps,
  activeCyclePaths,
  onSelectNode,
  onSelectFile,
  onUpdateData,
  hoveredNeighbourPath,
  onHoverPath,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set of opened folder node IDs
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());

  // Viewport transform state: Pan (x, y) and Zoom (scale)
  const [transform, setTransform] = useState({ x: 60, y: 40, scale: 0.85 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Dynamic node position overrides (allows moving any node or panel to the side)
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const getNodePos = useCallback(
    (node: FoldedNode) => {
      const pos = nodePositions.get(node.id);
      return pos || { x: node.x, y: node.y };
    },
    [nodePositions]
  );

  // Spacebar panning state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);

  // Canvas background panning state
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const canvasPanStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  // Node dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const nodeDragStartRef = useRef<{
    startX: number;
    startY: number;
    initialNodePos: { x: number; y: number };
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialNodePos: { x: 0, y: 0 },
    hasMoved: false,
  });

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

  // Fit view calculation based on current node positions
  const handleFitView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      const pos = getNodePos(n);
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + n.width);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + n.height);
    });

    const padding = 100;
    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const scale = Math.max(MIN_SCALE, Math.min(1.0, Math.min(scaleX, scaleY)));

    const x = (rect.width - (maxX - minX) * scale) / 2 - minX * scale;
    const y = (rect.height - (maxY - minY) * scale) / 2 - minY * scale;

    setTransform({ x: Math.round(x), y: Math.round(y), scale });
  }, [nodes, getNodePos]);

  // Reset zoom to 100% centered
  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const current = transformRef.current;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const worldCenterX = (centerX - current.x) / current.scale;
    const worldCenterY = (centerY - current.y) / current.scale;

    const targetScale = 1.0;
    const newX = centerX - worldCenterX * targetScale;
    const newY = centerY - worldCenterY * targetScale;

    setTransform({ x: Math.round(newX), y: Math.round(newY), scale: targetScale });
  }, []);

  // Reset node positions back to deterministic defaults
  const handleResetPositions = useCallback(() => {
    setNodePositions(new Map());
  }, []);

  // Zoom relative to viewport center (for buttons)
  const handleZoomStep = useCallback((factor: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const current = transformRef.current;

    const mouseX = rect.width / 2;
    const mouseY = rect.height / 2;

    const worldX = (mouseX - current.x) / current.scale;
    const worldY = (mouseY - current.y) / current.scale;

    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;

    setTransform({ x: Math.round(newX), y: Math.round(newY), scale: newScale });
  }, []);

  // Initial fit view on mount
  useEffect(() => {
    handleFitView();
  }, [handleFitView]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Cursor-anchored wheel & pinch handler
  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const current = transformRef.current;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const isPinch = e.ctrlKey || e.metaKey;
    const isNotchedMouseWheel =
      e.deltaMode === 1 || Math.abs(e.deltaY) >= 50 || e.deltaY % 40 === 0;

    if (isPinch || isNotchedMouseWheel) {
      let zoomFactor: number;
      if (isPinch) {
        zoomFactor = Math.pow(1.01, -e.deltaY * 1.5);
      } else {
        zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      }

      const worldX = (mouseX - current.x) / current.scale;
      const worldY = (mouseY - current.y) / current.scale;

      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * zoomFactor));
      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    } else {
      setTransform({
        x: current.x - e.deltaX,
        y: current.y - e.deltaY,
        scale: current.scale,
      });
    }
  }, []);

  // Attach non-passive wheel event listener specifically to canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest(".custom-scrollbar, [data-panel-scroll='true']")) {
        return;
      }

      e.preventDefault();
      handleCanvasWheel(e);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [handleCanvasWheel]);

  // Handle node drag start
  const handleNodeMouseDown = (node: FoldedNode, e: React.MouseEvent) => {
    if (isSpacePressedRef.current || e.button === 1) return;

    if (e.button === 0) {
      e.stopPropagation();
      const currentPos = getNodePos(node);
      nodeDragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialNodePos: currentPos,
        hasMoved: false,
      };
      setDraggedNodeId(node.id);
    }
  };

  // Canvas background drag start (Middle-click, Space+Click, Left-drag on background)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const isSpaceClick = e.button === 0 && isSpacePressedRef.current;
    const isBackgroundClick =
      e.button === 0 &&
      (e.target === containerRef.current ||
        (e.target as HTMLElement).tagName === "svg" ||
        (e.target as HTMLElement).classList.contains("canvas-stage-bg"));

    if (isMiddleClick || isSpaceClick || isBackgroundClick) {
      e.preventDefault();
      setIsCanvasPanning(true);
      canvasPanStart.current = {
        x: e.clientX,
        y: e.clientY,
        initialX: transformRef.current.x,
        initialY: transformRef.current.y,
      };
    }
  };

  // Window mouse move & up listeners for fluid dragging
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Move individual dragged node
      if (draggedNodeId) {
        const { startX, startY, initialNodePos } = nodeDragStartRef.current;
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist > 3) {
          nodeDragStartRef.current.hasMoved = true;
        }

        const scale = transformRef.current.scale;
        const deltaWorldX = (e.clientX - startX) / scale;
        const deltaWorldY = (e.clientY - startY) / scale;

        setNodePositions((prev) => {
          const next = new Map(prev);
          next.set(draggedNodeId, {
            x: Math.round(initialNodePos.x + deltaWorldX),
            y: Math.round(initialNodePos.y + deltaWorldY),
          });
          return next;
        });
        return;
      }

      // 2. Pan entire canvas
      if (isCanvasPanning) {
        const dx = e.clientX - canvasPanStart.current.x;
        const dy = e.clientY - canvasPanStart.current.y;
        setTransform((prev) => ({
          ...prev,
          x: canvasPanStart.current.initialX + dx,
          y: canvasPanStart.current.initialY + dy,
        }));
      }
    };

    const handleWindowMouseUp = () => {
      if (draggedNodeId) {
        const { hasMoved } = nodeDragStartRef.current;
        if (!hasMoved) {
          // Simple click without drag: select node
          onSelectNode(draggedNodeId);
          onSelectFile(null);
        }
        setDraggedNodeId(null);
      }
      if (isCanvasPanning) {
        setIsCanvasPanning(false);
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [draggedNodeId, isCanvasPanning, onSelectNode, onSelectFile]);

  // Toggle open/closed panel
  const toggleNodeOpen = useCallback(
    (nodeId: string) => {
      setOpenNodeIds((prev) => {
        const next = new Set(prev);
        const wasOpen = next.has(nodeId);

        if (wasOpen) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);

          setTimeout(() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const targetNode = nodeMap.get(nodeId);
              if (targetNode) {
                const pos = getNodePos(targetNode);
                setTransform((current) => {
                  const panelWidth = 320;
                  const panelHeight = 360;
                  const nodeScreenX = pos.x * current.scale + current.x;
                  const nodeScreenY = pos.y * current.scale + current.y;

                  let newScale = current.scale;
                  let newX = current.x;
                  let newY = current.y;

                  if (
                    nodeScreenX + panelWidth * current.scale > rect.width - 40 ||
                    nodeScreenY + panelHeight * current.scale > rect.height - 40 ||
                    nodeScreenX < 40 ||
                    nodeScreenY < 40
                  ) {
                    const zoomFactor = Math.min(
                      1,
                      (rect.width * 0.8) /
                        (panelWidth + Math.abs(pos.x - rect.width / 2)),
                      (rect.height * 0.8) /
                        (panelHeight + Math.abs(pos.y - rect.height / 2))
                    );
                    newScale = Math.min(
                      current.scale,
                      Math.max(MIN_SCALE, current.scale * zoomFactor)
                    );
                  }

                  return { x: newX, y: newY, scale: newScale };
                });
              }
            }
          }, 50);
        }
        return next;
      });
    },
    [nodeMap, getNodePos]
  );

  // Compute Category match counts per node
  const nodeMatchCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedCategoryId) return map;
    for (const node of nodes) {
      const count = node.files.filter((f) => getFileCategoryId(f.path) === selectedCategoryId).length;
      map.set(node.id, count);
    }
    return map;
  }, [nodes, selectedCategoryId]);

  // Compute Active/Dimmed State (Selection + Bi-directional Hovering + Traversal + Cycles)
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const activeNodes = new Set<string>();
    const activeEdges = new Set<string>();

    if (activeTraversalSteps && activeTraversalSteps.length > 0) {
      for (const step of activeTraversalSteps) {
        const stepNode = fileToNodeMap.get(step.path);
        const viaNode = fileToNodeMap.get(step.via);
        if (stepNode) activeNodes.add(stepNode);
        if (viaNode) activeNodes.add(viaNode);
        if (stepNode && viaNode && stepNode !== viaNode) {
          activeEdges.add(`${viaNode}->${stepNode}`);
          activeEdges.add(`${stepNode}->${viaNode}`);
        }
      }
    }

    if (activeCyclePaths && activeCyclePaths.length > 0) {
      for (let i = 0; i < activeCyclePaths.length; i++) {
        const p1 = activeCyclePaths[i];
        const p2 = activeCyclePaths[(i + 1) % activeCyclePaths.length];
        const n1 = fileToNodeMap.get(p1);
        const n2 = fileToNodeMap.get(p2);
        if (n1) activeNodes.add(n1);
        if (n2) activeNodes.add(n2);
        if (n1 && n2) {
          activeEdges.add(`${n1}->${n2}`);
        }
      }
    }

    if (hoveredNeighbourPath) {
      const parentNode = fileToNodeMap.get(hoveredNeighbourPath) || nodeMap.get(hoveredNeighbourPath)?.id;
      if (parentNode) activeNodes.add(parentNode);

      rawEdges.forEach((re) => {
        if (re.source === hoveredNeighbourPath || re.target === hoveredNeighbourPath) {
          const srcNode = fileToNodeMap.get(re.source);
          const tgtNode = fileToNodeMap.get(re.target);
          if (srcNode) activeNodes.add(srcNode);
          if (tgtNode) activeNodes.add(tgtNode);
          if (srcNode && tgtNode) activeEdges.add(`${srcNode}->${tgtNode}`);
        }
      });
      edges.forEach((e) => {
        if (e.sourceNodeId === hoveredNeighbourPath || e.targetNodeId === hoveredNeighbourPath) {
          activeNodes.add(e.sourceNodeId);
          activeNodes.add(e.targetNodeId);
          activeEdges.add(e.id);
        }
      });
    }

    if (selectedFilePath) {
      const parentNode = fileToNodeMap.get(selectedFilePath);
      if (parentNode) activeNodes.add(parentNode);

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
  }, [
    selectedNodeId,
    selectedFilePath,
    hoveredNeighbourPath,
    activeTraversalSteps,
    activeCyclePaths,
    edges,
    rawEdges,
    fileToNodeMap,
    nodeMap,
  ]);

  const hasSelection = Boolean(
    selectedNodeId ||
      selectedFilePath ||
      hoveredNeighbourPath ||
      (activeTraversalSteps && activeTraversalSteps.length > 0) ||
      (activeCyclePaths && activeCyclePaths.length > 0)
  );

  // Determine cursor style
  const cursorClass = isCanvasPanning
    ? "cursor-grabbing"
    : isSpacePressed
    ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      className={`flex-1 h-full relative overflow-hidden bg-zinc-950 select-none ${cursorClass}`}
    >
      {/* 1. Canvas Top Status Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-xl pointer-events-none">
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
          {nodes.length} folded nodes • {openNodeIds.size} open panels • Drag nodes to untangle
        </span>
      </div>

      {/* 2. Floating Navigation Controls in Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 backdrop-blur-md p-1.5 rounded-xl text-zinc-300 shadow-2xl">
        <button
          type="button"
          onClick={() => handleZoomStep(1.15)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom In (Scroll Up / Pinch Out)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleZoomStep(0.85)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom Out (Scroll Down / Pinch In)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-0.5" />

        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-1 rounded-lg text-[11px] font-mono hover:bg-zinc-800 hover:text-white transition-colors"
          title="Reset Zoom to 100%"
        >
          {Math.round(transform.scale * 100)}%
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-0.5" />

        <button
          type="button"
          onClick={handleFitView}
          className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
          title="Fit Graph to Viewport"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {nodePositions.size > 0 && (
          <>
            <div className="w-px h-4 bg-zinc-800 mx-0.5" />
            <button
              type="button"
              onClick={handleResetPositions}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
              title="Reset moved nodes back to original layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Mode Hint Badge in Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-500 pointer-events-none">
        <span className="flex items-center gap-1 text-zinc-400">
          <Move className="w-3 h-3 text-blue-400" /> Drag any node to reposition
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Hand className="w-3 h-3 text-zinc-400" /> Space + Drag / Middle Click to Pan
        </span>
      </div>

      {/* 3. Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none canvas-stage-bg"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
          backgroundSize: `${Math.round(28 * transform.scale)}px ${Math.round(28 * transform.scale)}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
        }}
      />

      {/* 4. Unified Scaled World Layer */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
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

            const srcPos = getNodePos(src);
            const tgtPos = getNodePos(tgt);

            const isEdgeActive = highlightedEdgeIds.has(edge.id);
            const isEdgeDimmed = hasSelection && !isEdgeActive;

            const isOpenSrc = openNodeIds.has(src.id);
            const isOpenTgt = openNodeIds.has(tgt.id);

            const srcWidth = isOpenSrc ? 320 : src.width;
            const srcHeight = isOpenSrc ? 280 : src.height;
            const tgtWidth = isOpenTgt ? 320 : tgt.width;
            const tgtHeight = isOpenTgt ? 280 : tgt.height;

            const x1 = srcPos.x + srcWidth / 2;
            const y1 = srcPos.y + srcHeight / 2;
            const x2 = tgtPos.x + tgtWidth / 2;
            const y2 = tgtPos.y + tgtHeight / 2;

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
                markerEnd={isEdgeActive ? "url(#edge-arrow-active)" : "url(#edge-arrow)"}
                opacity={isEdgeDimmed ? 0.08 : 1}
                className="transition-all duration-75"
              />
            );
          })}
        </svg>

        {/* Nodes Layer: Folded Nodes & Open Panels */}
        {nodes.map((node) => {
          const isOpen = openNodeIds.has(node.id);
          const isNodeSelected = selectedNodeId === node.id;
          const isNodeHighlighted = highlightedNodeIds.has(node.id);
          const matchedFilesCount = nodeMatchCounts.get(node.id) || 0;
          const isCategoryFiltered = Boolean(selectedCategoryId);
          const isCategoryDimmed = isCategoryFiltered && matchedFilesCount === 0;
          const isDimmed = (hasSelection && !isNodeHighlighted && !isNodeSelected) || isCategoryDimmed;
          const isBeingDragged = draggedNodeId === node.id;

          const pos = getNodePos(node);

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(node, e)}
              onWheel={(e) => {
                if (isOpen) e.stopPropagation();
              }}
              style={{
                position: "absolute",
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: isBeingDragged ? 60 : isOpen ? 30 : isNodeSelected ? 20 : 10,
              }}
              className={`${
                isBeingDragged
                  ? "ring-2 ring-blue-500/80 shadow-2xl scale-[1.02]"
                  : ""
              }`}
            >
              {isOpen ? (
                <OpenPanelComponent
                  node={node}
                  selectedFilePath={selectedFilePath}
                  selectedCategoryId={selectedCategoryId}
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
                  selectedCategoryId={selectedCategoryId}
                  matchedFilesCount={matchedFilesCount}
                  onClick={(e) => {
                    if (isSpacePressedRef.current) return;
                    e.stopPropagation();
                    onSelectNode(node.id);
                    onSelectFile(null);
                  }}
                  onOpen={(e) => {
                    if (isSpacePressedRef.current) return;
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
