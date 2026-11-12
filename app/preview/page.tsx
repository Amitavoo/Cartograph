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

const scaffoldData = scaffoldDataRaw as unknown as ParserOutput;

export default function PreviewPage() {
  const categories = useMemo(
    () => deriveCategories(scaffoldData.files),
    []
  );

  // Compute folded module nodes and inter-node edges
  const foldingResult = useMemo(
    () => computeFoldedGraph(scaffoldData.files, scaffoldData.edges, 24),
    []
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* 1. Header */}
      <PreviewHeader
        filesCount={scaffoldData.files.length}
        edgesCount={scaffoldData.edges.length}
        foldersCount={scaffoldData.folders.length}
      />

      {/* 2. Permanent Three-Column Layout */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Column: Categorized file distribution */}
        <LeftRail
          categories={categories}
          totalFiles={scaffoldData.files.length}
        />

        {/* Center Column: Interactive Map Canvas */}
        <MapCanvas
          nodes={foldingResult.nodes}
          edges={foldingResult.edges}
          rawEdges={scaffoldData.edges}
          selectedNodeId={selectedNodeId}
          selectedFilePath={selectedFile?.path || null}
          onSelectNode={handleSelectNode}
          onSelectFile={handleSelectFile}
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
