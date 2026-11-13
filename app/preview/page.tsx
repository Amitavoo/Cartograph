"use client";

import React, { useState, useMemo } from "react";
import scaffoldDataRaw from "@/src/scaffolding/scaffold-data.json";
import { ParserOutput, ParsedFile } from "@/src/parser/types";
import { deriveCategories } from "@/src/scaffolding/categories";
import { computeFoldedGraph } from "@/src/folding/engine";
import {
  buildFileRelationshipIndex,
  analyzeRepository,
} from "@/src/scaffolding/repository-analysis";
import {
  computeTransitiveWalk,
  computeRepositoryInsights,
  TransitiveStep,
} from "@/src/graph/traversal";
import { PreviewHeader } from "./_components/preview-header";
import { LeftRail } from "./_components/left-rail";
import { MapCanvas } from "./_components/map-canvas";
import { DetailPane } from "./_components/detail-pane";
import { RoutesTable } from "./_components/routes-table";
import { extractRepositoryRoutes } from "@/src/scaffolding/routes";
import { Network, Route } from "lucide-react";

const initialScaffoldData = scaffoldDataRaw as unknown as ParserOutput;

export default function PreviewPage() {
  const [activeData, setActiveData] = useState<ParserOutput>(initialScaffoldData);

  const categories = useMemo(
    () => deriveCategories(activeData.files),
    [activeData.files]
  );

  // Phase 6: Left rail active category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Center column tab: map vs routes
  const [centerTab, setCenterTab] = useState<"map" | "routes">("map");

  // Extracted deterministic framework routes
  const routes = useMemo(
    () => extractRepositoryRoutes(activeData.files),
    [activeData.files]
  );

  // Compute folded module nodes and inter-node edges
  const foldingResult = useMemo(
    () => computeFoldedGraph(activeData.files, activeData.edges, 24),
    [activeData.files, activeData.edges]
  );

  // Compute relationship index (exact incoming and outgoing dependencies per file)
  const relIndex = useMemo(
    () => buildFileRelationshipIndex(activeData.files, activeData.edges),
    [activeData.files, activeData.edges]
  );

  // Compute repository-level analysis for resting state
  const summary = useMemo(
    () =>
      analyzeRepository(
        activeData.repositoryPath.includes("hono")
          ? "honojs / hono"
          : activeData.repositoryPath,
        activeData.files,
        activeData.edges,
        relIndex
      ),
    [activeData.repositoryPath, activeData.files, activeData.edges, relIndex]
  );

  // Phase 6: Edge-list repository insights (no model, 4 fixed sentences)
  const insights = useMemo(
    () => computeRepositoryInsights(activeData.files, activeData.edges),
    [activeData.files, activeData.edges]
  );

  // Phase 5 Tabs: "structure" | "explanation" (Preserved across file/module selections)
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");

  // Bi-directional hover highlighting
  const [hoveredNeighbourPath, setHoveredNeighbourPath] = useState<string | null>(null);

  // Interactive selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null);

  // Phase 6: Transitive Traversal (Blast radius & Dependency chain)
  const [activeTraversal, setActiveTraversal] = useState<{
    type: "blast" | "chain";
    file: ParsedFile;
    steps: TransitiveStep[];
  } | null>(null);

  // Phase 6: Active Cycle Highlight
  const [activeCyclePaths, setActiveCyclePaths] = useState<string[] | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return foldingResult.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, foldingResult.nodes]);

  const handleSelectCategory = (catId: string | null) => {
    setSelectedCategoryId(catId);
    if (!catId) {
      setSelectedNodeId(null);
      setSelectedFile(null);
      setActiveTraversal(null);
      setActiveCyclePaths(null);
      setHoveredNeighbourPath(null);
    }
  };

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setSelectedFile(null);
      setActiveTraversal(null);
      setActiveCyclePaths(null);
    }
  };

  const handleSelectFile = (file: ParsedFile | null) => {
    setSelectedFile(file);
    setActiveTraversal(null);
    setActiveCyclePaths(null);
    if (file) {
      const parentNodeId = foldingResult.fileToNodeMap.get(file.path);
      if (parentNodeId) {
        setSelectedNodeId(parentNodeId);
      }
    }
  };

  const handleStartTraversal = (type: "blast" | "chain", file: ParsedFile) => {
    const dir = type === "blast" ? "upstream" : "downstream";
    const steps = computeTransitiveWalk(file.path, activeData.edges, dir, 2);
    setActiveTraversal({ type, file, steps });
    setActiveCyclePaths(null);
  };

  const handleSelectCycle = (paths: string[]) => {
    setActiveCyclePaths(paths);
    setActiveTraversal(null);
    if (paths.length > 0) {
      const firstFile = activeData.files.find((f) => f.path === paths[0]);
      if (firstFile) {
        setSelectedFile(firstFile);
        const parentNodeId = foldingResult.fileToNodeMap.get(firstFile.path);
        if (parentNodeId) {
          setSelectedNodeId(parentNodeId);
        }
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedNodeId(null);
    setSelectedFile(null);
    setActiveTraversal(null);
    setActiveCyclePaths(null);
    setHoveredNeighbourPath(null);
  };

  const handleUpdateData = (newData: ParserOutput) => {
    setActiveData(newData);
    setSelectedNodeId(null);
    setSelectedFile(null);
    setActiveTraversal(null);
    setActiveCyclePaths(null);
    setHoveredNeighbourPath(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* 1. Header with dynamic repository title */}
      <PreviewHeader
        repoName={summary.name}
        framework={summary.framework}
        filesCount={activeData.files.length}
        edgesCount={activeData.edges.length}
        foldersCount={activeData.folders.length}
      />

      {/* 2. Permanent Three-Column Layout */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Column: Categorized file distribution (clickable category dimming) */}
        <LeftRail
          categories={categories}
          totalFiles={activeData.files.length}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        {/* Center Column: Top Sub-Navbar (Map | Routes) + MapCanvas or RoutesTable */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Top Sub-Navbar: Map vs Routes tabs */}
          <div className="h-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCenterTab("map")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${centerTab === "map"
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
                  }`}
              >
                <Network className="w-3.5 h-3.5 text-blue-400" />
                <span>Map</span>
              </button>

              <button
                type="button"
                onClick={() => setCenterTab("routes")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${centerTab === "routes"
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]"
                  }`}
              >
                <Route className="w-3.5 h-3.5 text-purple-400" />
                <span>Routes</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  {routes.length}
                </span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-[var(--color-text-muted)] hidden md:block">
              {centerTab === "map" ? (
                <span>Interactive Canvas • {foldingResult.nodes.length} nodes</span>
              ) : (
                <span>{routes.length} extracted routes</span>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
            {centerTab === "map" ? (
              <MapCanvas
                nodes={foldingResult.nodes}
                edges={foldingResult.edges}
                rawEdges={activeData.edges}
                selectedNodeId={selectedNodeId}
                selectedFilePath={selectedFile?.path || null}
                selectedCategoryId={selectedCategoryId}
                activeTraversalSteps={activeTraversal?.steps || null}
                activeCyclePaths={activeCyclePaths}
                onSelectNode={handleSelectNode}
                onSelectFile={handleSelectFile}
                onUpdateData={handleUpdateData}
                hoveredNeighbourPath={hoveredNeighbourPath}
                onHoverPath={setHoveredNeighbourPath}
              />
            ) : (
              <RoutesTable
                routes={routes}
                allFiles={activeData.files}
                onSelectFile={(file) => {
                  handleSelectFile(file);
                  setCenterTab("map");
                }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Permanent Phase 5/6 Detail Inspector Pane */}
        <DetailPane
          summary={summary}
          relIndex={relIndex}
          selectedNode={selectedNode}
          selectedFile={selectedFile}
          edges={foldingResult.edges}
          rawEdges={activeData.edges}
          insights={insights}
          allFiles={activeData.files}
          activeTab={activeTab}
          activeTraversal={activeTraversal}
          onTabChange={setActiveTab}
          onClearSelection={handleClearSelection}
          onSelectFile={handleSelectFile}
          onSelectNode={handleSelectNode}
          onStartTraversal={handleStartTraversal}
          onClearTraversal={() => setActiveTraversal(null)}
          onSelectCycle={handleSelectCycle}
          hoveredNeighbourPath={hoveredNeighbourPath}
          onHoverPath={setHoveredNeighbourPath}
        />
      </div>
    </div>
  );
}
