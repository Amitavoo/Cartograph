import * as fs from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import * as tar from "tar";
import { ParsedRepoInfo, RepoMetadata } from "./types";

/**
 * Normalizes and extracts GitHub owner/repo from various URL input shapes:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo/
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseRepositoryUrl(rawUrl: string): ParsedRepoInfo {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Repository URL must be a non-empty string");
  }

  let cleaned = rawUrl.trim();

  // Strip git+ or git@ prefix
  if (cleaned.startsWith("git@github.com:")) {
    cleaned = cleaned.replace("git@github.com:", "https://github.com/");
  }

  // Remove protocol if present for standard parsing
  cleaned = cleaned.replace(/^https?:\/\//, "");

  // Remove trailing slashes and .git
  cleaned = cleaned.replace(/\.git\/?$/, "").replace(/\/+$/, "");

  // If starts with github.com/, strip it
  cleaned = cleaned.replace(/^github\.com\//, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      `Invalid repository URL "${rawUrl}". Expected format: https://github.com/owner/repo or owner/repo`
    );
  }

  const owner = parts[0];
  const repo = parts[1];

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    normalizedUrl: `https://github.com/https://github.com/${owner}/${repo}`.replace("https://github.com/https://github.com/", "https://github.com/"),
  };
}

/**
 * Fetches public repository metadata (commit SHA and default branch)
 * without requiring any GitHub authentication token or OAuth scope.
 */
export async function fetchRepositoryMetadata(
  owner: string,
  repo: string
): Promise<RepoMetadata> {
  const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const res = await fetch(repoApiUrl, {
    headers: {
      "User-Agent": "Cartograph-Engine",
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (res.status === 404) {
    throw new Error(`Repository not found on GitHub: ${owner}/${repo}`);
  }

  if (res.status === 403) {
    const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
    if (rateLimitRemaining === "0") {
      throw new Error(
        "GitHub API rate limit reached for anonymous requests. Please wait a moment and try again."
      );
    }
    throw new Error(`Access forbidden when querying GitHub repository: ${owner}/${repo}`);
  }

  if (!res.ok) {
    throw new Error(
      `GitHub API error (${res.status}): Failed to fetch metadata for ${owner}/${repo}`
    );
  }

  const repoData = (await res.json()) as { default_branch?: string };
  const defaultBranch = repoData.default_branch || "main";

  // Now fetch the HEAD commit SHA for this branch
  const commitApiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`;
  const commitRes = await fetch(commitApiUrl, {
    headers: {
      "User-Agent": "Cartograph-Engine",
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!commitRes.ok) {
    throw new Error(
      `Failed to determine commit SHA for ${owner}/${repo} on branch "${defaultBranch}"`
    );
  }

  const commitData = (await commitRes.json()) as { sha?: string };
  const commitHash = commitData.sha;

  if (!commitHash) {
    throw new Error(`Could not locate commit SHA for ${owner}/${repo}`);
  }

  return {
    commitHash,
    defaultBranch,
  };
}

/**
 * Downloads public repository tarball and extracts it into the target folder.
 * Strips the top-level GitHub directory packaging (strip: 1).
 */
export async function downloadAndExtractArchive(
  owner: string,
  repo: string,
  commitHash: string,
  targetDir: string
): Promise<void> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${commitHash}`;

  const res = await fetch(tarballUrl, {
    headers: {
      "User-Agent": "Cartograph-Engine",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to download archive for ${owner}/${repo}@${commitHash.slice(0, 7)} (HTTP ${res.status})`
    );
  }

  if (!res.body) {
    throw new Error("Empty archive response received from GitHub");
  }

  // Convert Web ReadableStream to Node.js Readable stream
  const nodeReadable = Readable.fromWeb(res.body as any);

  // Extract using tar.x with strip: 1 to remove github container folder
  await new Promise<void>((resolve, reject) => {
    const extractStream = tar.x({
      cwd: targetDir,
      strip: 1,
    });

    nodeReadable
      .pipe(extractStream)
      .on("finish", () => resolve())
      .on("error", (err: Error) => reject(err));
  });
}

