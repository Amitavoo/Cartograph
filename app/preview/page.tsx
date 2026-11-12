"use client";

import React, { useState, useMemo } from "react";
import scaffoldDataRaw from "@/src/scaffolding/scaffold-data.json";
import { ParserOutput, ParsedFile } from "@/src/parser/types";
import { deriveCategories } from "@/src/scaffolding/categories";
import { computeFoldedGraph } from "@/src/folding/engine";
import { PreviewHeader } from "./_components/preview-header";
import { LeftRail } from "./_components/left-rail";
import { MapCanvas } from "./_components/map-canvas";
import { DetailPane } from "./_components/detail-pane";

const initialScaffoldData = scaffoldDataRaw as unknown as ParserOutput;

export default function PreviewPage() {
  const [activeData, setActiveData] = useState<ParserOutput>(initialScaffoldData);

  const categories = useMemo(
    () => deriveCategories(activeData.files),
    [activeData.files]
  );

  // Compute folded module nodes and inter-node edges
  const foldingResult = useMemo(
    () => computeFoldedGraph(activeData.files, activeData.edges, 24),
    [activeData.files, activeData.edges]
  );

  // Interactive selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return foldingResult.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, foldingResult.nodes]);

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setSelectedFile(null);
    }
  };

  const handleSelectFile = (file: ParsedFile | null) => {
    setSelectedFile(file);
    if (file) {
      const parentNodeId = foldingResult.fileToNodeMap.get(file.path);
      if (parentNodeId) {
        setSelectedNodeId(parentNodeId);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedNodeId(null);
    setSelectedFile(null);
  };

  const handleUpdateData = (newData: ParserOutput) => {
    setActiveData(newData);
    setSelectedNodeId(null);
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* 1. Header with dynamic repository title */}
      <PreviewHeader
        repoName={activeData.repositoryPath}
        filesCount={activeData.files.length}
        edgesCount={activeData.edges.length}
        foldersCount={activeData.folders.length}
      />

      {/* 2. Permanent Three-Column Layout */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Column: Categorized file distribution */}
        <LeftRail
          categories={categories}
          totalFiles={activeData.files.length}
        />

        {/* Center Column: Interactive Map Canvas with Global Drag & Drop */}
        <MapCanvas
          nodes={foldingResult.nodes}
          edges={foldingResult.edges}
          rawEdges={activeData.edges}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFile?.path || null}
          onSelectNode={handleSelectNode}
          onSelectFile={handleSelectFile}
          onUpdateData={handleUpdateData}
        />

        {/* Right Column: Permanent detail inspector pane */}
        <DetailPane
          selectedNode={selectedNode}
          selectedFile={selectedFile}
          edges={foldingResult.edges}
          onClearSelection={handleClearSelection}
          onSelectFile={handleSelectFile}
        />
      </div>
    </div>
  );
}
