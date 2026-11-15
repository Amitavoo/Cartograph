"use client";

import React, { useState, useMemo } from "react";
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
import { PreviewHeader } from "@/app/preview/_components/preview-header";
import { LeftRail } from "@/app/preview/_components/left-rail";
import { MapCanvas } from "@/app/preview/_components/map-canvas";
import { DetailPane } from "@/app/preview/_components/detail-pane";
import { CoverageBanner } from "./coverage-banner";

interface AnalysisExplorerProps {
  initialData: ParserOutput;
  coveragePercentage: number | null;
  repositoryName: string;
}

export function AnalysisExplorer({
  initialData,
  coveragePercentage,
  repositoryName,
}: AnalysisExplorerProps) {
  const [activeData, setActiveData] = useState<ParserOutput>(initialData);

  const categories = useMemo(
    () => deriveCategories(activeData.files),
    [activeData.files]
  );

  // Left rail active category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
        repositoryName || activeData.repositoryPath,
        activeData.files,
        activeData.edges,
        relIndex
      ),
    [repositoryName, activeData.repositoryPath, activeData.files, activeData.edges, relIndex]
  );

  // Repository insights (4 kinds, 4 fixed sentences)
  const insights = useMemo(
    () => computeRepositoryInsights(activeData.files, activeData.edges),
    [activeData.files, activeData.edges]
  );

  // Structure vs Explanation tab
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");

  // Bi-directional hover highlighting
  const [hoveredNeighbourPath, setHoveredNeighbourPath] = useState<string | null>(null);

  // Interactive selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null);

  // Transitive Traversal (Blast radius & Dependency chain)
  const [activeTraversal, setActiveTraversal] = useState<{
    type: "blast" | "chain";
    file: ParsedFile;
    steps: TransitiveStep[];
  } | null>(null);

  // Active Cycle Highlight
  const [activeCyclePaths, setActiveCyclePaths] = useState<string[] | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return foldingResult.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, foldingResult.nodes]);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* 1. Header with dynamic repository title */}
      <PreviewHeader
        repoName={summary.name}
        filesCount={activeData.files.length}
        edgesCount={activeData.edges.length}
        foldersCount={activeData.folders.length}
      />

      {/* 2. Coverage Banner (Displays when resolution coverage < 95%) */}
      <CoverageBanner
        coveragePercentage={coveragePercentage}
        fileCount={activeData.files.length}
        edgeCount={activeData.edges.length}
      />

      {/* 3. Three-Column Layout reading live stored data */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Column: Categorized file distribution (clickable category dimming) */}
        <LeftRail
          categories={categories}
          totalFiles={activeData.files.length}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        {/* Center Column: Interactive Map Canvas */}
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
          onUpdateData={setActiveData}
          hoveredNeighbourPath={hoveredNeighbourPath}
          onHoverPath={setHoveredNeighbourPath}
        />

        {/* Right Column: Detail Inspector Pane */}
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

