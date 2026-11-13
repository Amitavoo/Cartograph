export type PipelineStage =
  | "queued"
  | "fetching"
  | "selecting"
  | "parsing"
  | "storing"
  | "completed"
  | "failed";

export type PipelineStatus = "pending" | "running" | "completed" | "failed";

export interface ParsedRepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  normalizedUrl: string;
}

export interface RepoMetadata {
  commitHash: string;
  defaultBranch: string;
}

export interface PipelineParams {
  repositoryUrl: string;
  organizationId: string;
  forceRerun?: boolean;
}

export interface StoredProject {
  id: string;
  organization_id: string;
  name: string;
  repository_url: string;
  default_branch: string;
}

export interface StoredAnalysis {
  id: string;
  organization_id: string;
  project_id: string;
  status: PipelineStatus;
  stage: PipelineStage;
  stage_message: string | null;
  commit_hash: string | null;
  branch: string;
  file_count: number;
  edge_count: number;
  coverage_percentage: number | null;
  error_message: string | null;
  failed_at_stage: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface PipelineResult {
  project: StoredProject;
  analysis: StoredAnalysis;
  isExisting: boolean;
}

