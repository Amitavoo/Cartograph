import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/utils/supabase/server";
import { getStoredAnalysisData } from "@/src/pipeline/storage";
import { ProgressTracker } from "./_components/progress-tracker";
import { AnalysisExplorer } from "./_components/analysis-explorer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: PageProps) {
  const { id } = await params;
  await auth.protect();

  const supabase = await createServerSupabaseClient();
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select(`
      id,
      status,
      stage,
      stage_message,
      failed_at_stage,
      commit_hash,
      branch,
      file_count,
      edge_count,
      coverage_percentage,
      error_message,
      created_at,
      completed_at,
      updated_at,
      projects (
        id,
        name,
        repository_url,
        default_branch
      )
    `)
    .eq("id", id)
    .single();

  if (error || !analysis) {
    notFound();
  }

  // If already completed, load real stored files & edges from Postgres
  if (analysis.status === "completed") {
    const storedGraphData = await getStoredAnalysisData(id);

    if (storedGraphData && storedGraphData.files.length > 0) {
      return (
        <AnalysisExplorer
          initialData={storedGraphData}
          coveragePercentage={analysis.coverage_percentage}
          repositoryName={(analysis.projects as any)?.name || "Repository"}
        />
      );
    }
  }

  // Otherwise render live progress tracker
  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)] py-12 px-4">
      <ProgressTracker initialAnalysis={analysis as any} />
    </div>
  );
}

