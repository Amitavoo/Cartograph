"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FoldedNode, NodeEdge } from "@/src/folding/types";
import { ParsedFile, ParserOutput } from "@/src/parser/types";
import { FoldedNodeComponent } from "./folded-node";
import { OpenPanelComponent } from "./open-panel";
import { DropOverlay } from "./drop-overlay";
import { UploadProgressModal, ProcessingState } from "./upload-progress-modal";
import {
  traverseDataTransferItems,
  processFileListFallback,
  DroppedFileEntry,
} from "@/src/utils/file-traversal";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderOpen,
  Layers,
  Sparkles,
  UploadCloud,
  FolderUp,
  RotateCcw,
  Hand,
} from "lucide-react";

interface MapCanvasProps {
  nodes: FoldedNode[];
  edges: NodeEdge[];
  rawEdges: Array<{ source: string; target: string; kind?: string }>;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectFile: (file: ParsedFile | null) => void;
  onUpdateData?: (newData: ParserOutput) => void;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3.0;

export function MapCanvas({
  nodes,
  edges,
  rawEdges,
  selectedNodeId,
  selectedFilePath,
  onSelectNode,
  onSelectFile,
  onUpdateData,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Ingestion state modal
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    stage: "traversing",
    totalFiles: 0,
    totalFolders: 0,
  });

  // Set of opened folder node IDs
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());

  // Viewport transform state: Pan (x, y) and Zoom (scale)
  const [transform, setTransform] = useState({ x: 60, y: 40, scale: 0.85 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Spacebar pan mode
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);

  // Drag-panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

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

  // Prevent browser window from opening dropped files anywhere outside canvas
  useEffect(() => {
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, []);

  // Track Spacebar for Figma/Miro-style hold-to-pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isSpacePressedRef.current &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
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

  // Process dropped or selected files
  const processIngestion = async (
    fileEntries: DroppedFileEntry[],
    folderCount: number,
    skippedCount: number,
    errors: string[] = []
  ) => {
    if (fileEntries.length === 0) {
      setProcessingState({
        isProcessing: false,
        stage: "error",
        totalFiles: 0,
        totalFolders: 0,
        errorMessage: "No valid files found in dropped selection.",
      });
      return;
    }

    setProcessingState({
      isProcessing: true,
      stage: "parsing",
      totalFiles: fileEntries.length,
      totalFolders: folderCount,
      skippedCount,
      errors,
    });

    try {
      let detectedRepoName = "drag-and-drop-workspace";
      const sample = fileEntries[0]?.relativePath;
      if (sample && sample.includes("/")) {
        detectedRepoName = sample.split("/")[0];
      }

      const payloads: Array<{ path: string; content: string; size: number }> = [];

      for (const entry of fileEntries) {
        try {
          const text = await entry.file.text();
          payloads.push({
            path: entry.relativePath,
            content: text,
            size: entry.file.size,
          });
        } catch {
          // Skip binary
        }
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: detectedRepoName,
          files: payloads,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to analyze uploaded files");
      }

      if (onUpdateData) {
        onUpdateData(json.data);
      }

      setProcessingState({
        isProcessing: false,
        stage: "complete",
        totalFiles: payloads.length,
        totalFolders: folderCount,
        skippedCount,
      });

      setTimeout(() => {
        handleFitView();
      }, 100);
    } catch (err: any) {
      console.error("Ingestion failed:", err);
      setProcessingState({
        isProcessing: false,
        stage: "error",
        totalFiles: fileEntries.length,
        totalFolders: folderCount,
        errorMessage: err?.message || "Failed to parse files.",
      });
    }
  };

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setProcessingState({
      isProcessing: true,
      stage: "traversing",
      totalFiles: 0,
      totalFolders: 0,
    });

    try {
      const traversal = await traverseDataTransferItems(
        items,
        (foundCount, currentFolder) => {
          setProcessingState((prev) => ({
            ...prev,
            totalFiles: foundCount,
            currentFolder,
          }));
        }
      );

      await processIngestion(
        traversal.files,
        traversal.folderCount,
        traversal.skippedCount,
        traversal.errors
      );
    } catch (err: any) {
      setProcessingState({
        isProcessing: false,
        stage: "error",
        totalFiles: 0,
        totalFolders: 0,
        errorMessage: err?.message || "Error reading dropped items",
      });
    }
  };

  // Manual Upload Handlers
  const handleManualFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setProcessingState({
      isProcessing: true,
      stage: "traversing",
      totalFiles: fileList.length,
      totalFolders: 1,
    });

    const traversal = processFileListFallback(fileList);
    await processIngestion(traversal.files, 1, 0);
  };

  const handleManualFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setProcessingState({
      isProcessing: true,
      stage: "traversing",
      totalFiles: fileList.length,
      totalFolders: 0,
    });

    const traversal = processFileListFallback(fileList);
    await processIngestion(traversal.files, 0, 0);
  };

  // Fit View
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

    const graphWidth = maxX - minX + 180;
    const graphHeight = maxY - minY + 180;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const scale = Math.max(MIN_SCALE, Math.min(1.0, Math.min(scaleX, scaleY)));

    const x = (rect.width - graphWidth * scale) / 2 - minX * scale + 90 * scale;
    const y = (rect.height - graphHeight * scale) / 2 - minY * scale + 90 * scale;

    setTransform({ x, y, scale });
  }, [nodes]);

  // Reset Zoom (100% scale)
  const handleResetZoom = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) {
      setTransform({ x: 60, y: 40, scale: 1.0 });
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const current = transformRef.current;

    // Anchor zoom to canvas center
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const wx = (cx - current.x) / current.scale;
    const wy = (cy - current.y) / current.scale;

    const newScale = 1.0;
    const newX = cx - wx * newScale;
    const newY = cy - wy * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, [nodes]);

  // Zoom relative to cursor helper
  const zoomAtPoint = useCallback((clientX: number, clientY: number, factor: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const current = transformRef.current;

    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
    if (newScale === current.scale) return;

    // Cursor position relative to canvas
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    // World coordinate under cursor before zoom
    const wx = (cx - current.x) / current.scale;
    const wy = (cy - current.y) / current.scale;

    // New translation keeping (wx, wy) fixed under (cx, cy)
    const newX = cx - wx * newScale;
    const newY = cy - wy * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, []);

  // Zoom in / out buttons (anchored to canvas center)
  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.2);
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.83);
  };

  // Native Wheel & Gesture Event Listener (with passive: false to prevent browser page zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // If pointer is inside a panel's scrollable list, allow natural scroll
      const isInsideScrollable = (e.target as HTMLElement)?.closest(".overflow-y-auto");
      if (isInsideScrollable) {
        return;
      }

      // Prevent default page scrolling or page zoom
      e.preventDefault();

      const rect = container.getBoundingClientRect();

      // Case 1: Laptop trackpad pinch gesture (e.ctrlKey === true)
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.015;
        const factor = Math.exp(delta);
        zoomAtPoint(e.clientX, e.clientY, factor);
        return;
      }

      // Case 2: Laptop two-finger trackpad panning (horizontal delta present or shift held)
      if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
        setTransform((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
        return;
      }

      // Case 3: Mouse Wheel Zoom (or trackpad vertical scroll)
      // Scrolling wheel upward zooms in; downward zooms out. Anchored to cursor!
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      zoomAtPoint(e.clientX, e.clientY, factor);
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, [zoomAtPoint]);

  // Initial fit view on mount
  useEffect(() => {
    handleFitView();
  }, [handleFitView]);

  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Support left-click drag, middle-click drag, or Space + click
    const isLeftClick = e.button === 0;
    const isMiddleClick = e.button === 1;

    if (!isLeftClick && !isMiddleClick) return;

    // If clicking on an interactive node or panel, let it handle its own clicks
    const isInteractive = (e.target as HTMLElement)?.closest(".cursor-pointer, input, button");
    if (isInteractive && !isSpacePressedRef.current && !isMiddleClick) {
      return;
    }

    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

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

          // Refit rule: Opening a folder refits view so new panel is visible, only ever zooming out
          setTimeout(() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const targetNode = nodeMap.get(nodeId);
              if (targetNode) {
                setTransform((current) => {
                  const panelWidth = 320;
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
                    const zoomFactor = Math.min(
                      1,
                      (rect.width * 0.8) /
                        (panelWidth + Math.abs(targetNode.x - rect.width / 2)),
                      (rect.height * 0.8) /
                        (panelHeight + Math.abs(targetNode.y - rect.height / 2))
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
    [nodeMap]
  );

  // Compute Active/Dimmed State
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

  // Cursor style based on interaction
  const canvasCursorClass = isPanning
    ? "cursor-grabbing"
    : isSpacePressed
    ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 h-full relative overflow-hidden bg-zinc-950 select-none ${canvasCursorClass}`}
    >
      {/* 1. Full-Canvas Drag Overlay */}
      <DropOverlay isVisible={isDraggingOver} />

      {/* 2. Ingestion Progress & Status Modal */}
      <UploadProgressModal
        state={processingState}
        onClose={() =>
          setProcessingState((p) => ({ ...p, isProcessing: false, stage: "complete" }))
        }
      />

      {/* 3. Hidden File/Folder Inputs for Manual Upload */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleManualFolderSelect}
        // @ts-expect-error webkitdirectory is standard in browser engines
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={filesInputRef}
        onChange={handleManualFilesSelect}
        multiple
        className="hidden"
      />

      {/* 4. Canvas Top Status Overlay & Manual Upload Action */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-xl pointer-events-auto">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Interactive Canvas</span>
        </span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-400 font-mono text-[11px] hidden sm:inline">
          {nodes.length} folded nodes • {openNodeIds.size} open panels • {edges.length} edges
        </span>
        <span className="text-zinc-700 hidden sm:inline">|</span>

        {/* Manual Upload Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            title="Import an entire folder from disk"
          >
            <FolderUp className="w-3 h-3 text-blue-400" />
            <span>Import Folder</span>
          </button>
          <button
            type="button"
            onClick={() => filesInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            title="Import files from disk"
          >
            <UploadCloud className="w-3 h-3 text-emerald-400" />
            <span>Files</span>
          </button>
        </div>
      </div>

      {/* 5. Floating Zoom & Navigation Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-zinc-900/95 border border-zinc-800 backdrop-blur-md p-1 rounded-lg text-zinc-300 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom In (Scroll Up or Pinch)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Zoom Out (Scroll Down or Pinch)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-1 rounded hover:bg-zinc-800 hover:text-white transition-colors text-[10px] font-mono"
          title="Reset Zoom to 100%"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          type="button"
          onClick={handleFitView}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          title="Fit Entire Graph to View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 6. Spacebar Pan Mode Indicator */}
      {isSpacePressed && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-blue-600/90 text-white border border-blue-400/40 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-medium shadow-lg animate-in fade-in duration-150">
          <Hand className="w-3.5 h-3.5" />
          <span>Pan Mode Active (Drag to navigate)</span>
        </div>
      )}

      {/* 7. Infinite Viewport Stage */}
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

            const srcWidth = isOpenSrc ? 320 : src.width;
            const srcHeight = isOpenSrc ? 280 : src.height;
            const tgtWidth = isOpenTgt ? 320 : tgt.width;
            const tgtHeight = isOpenTgt ? 280 : tgt.height;

            const x1 = src.x + srcWidth / 2;
            const y1 = src.y + srcHeight / 2;
            const x2 = tgt.x + tgtWidth / 2;
            const y2 = tgt.y + tgtHeight / 2;

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
