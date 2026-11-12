import scaffoldDataRaw from "@/src/scaffolding/scaffold-data.json";
import { ParserOutput } from "@/src/parser/types";
import { deriveCategories } from "@/src/scaffolding/categories";
import { PreviewHeader } from "./_components/preview-header";
import { LeftRail } from "./_components/left-rail";
import { MapCanvasContainer } from "./_components/map-canvas-container";
import { DetailPane } from "./_components/detail-pane";

const scaffoldData = scaffoldDataRaw as unknown as ParserOutput;

export const metadata = {
  title: "Repository Map Preview | Cartograph",
  description: "Phase 4 interactive map preview shell",
};

export default function PreviewPage() {
  const categories = deriveCategories(scaffoldData.files);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* 1. Top Navigation Bar */}
      <PreviewHeader
        filesCount={scaffoldData.files.length}
        edgesCount={scaffoldData.edges.length}
        foldersCount={scaffoldData.folders.length}
      />

      {/* 2. Permanent Three-Column Shell */}
      <div className="flex-1 flex w-full overflow-hidden min-h-0">
        {/* Left Column: Narrow category rail */}
        <LeftRail
          categories={categories}
          totalFiles={scaffoldData.files.length}
        />

        {/* Center Column: The map filling the middle (no graph yet) */}
        <MapCanvasContainer
          filesCount={scaffoldData.files.length}
          edgesCount={scaffoldData.edges.length}
        />

        {/* Right Column: Empty detail inspector pane */}
        <DetailPane />
      </div>
    </div>
  );
}
