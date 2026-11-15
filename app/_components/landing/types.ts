export interface RepoValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
  owner?: string;
  repo?: string;
}

export function validateGitHubUrl(raw: string): RepoValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: "Please enter a public GitHub repository URL or owner/repo path.",
    };
  }

  // Reject unsupported non-GitHub hosts
  if (
    trimmed.includes("gitlab.com") ||
    trimmed.includes("bitbucket.org") ||
    trimmed.includes("dev.azure.com")
  ) {
    return {
      isValid: false,
      error: "Only public GitHub repositories are currently supported.",
    };
  }

  // Strip git+ or git@ prefix
  let cleaned = trimmed;
  if (cleaned.startsWith("git@github.com:")) {
    cleaned = cleaned.replace("git@github.com:", "https://github.com/");
  }

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Remove trailing slashes and .git
  cleaned = cleaned.replace(/\.git\/?$/i, "").replace(/\/+$/, "");

  // Remove github.com/ if present
  cleaned = cleaned.replace(/^(www\.)?github\.com\//i, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) {
    return {
      isValid: false,
      error: "Please specify both the repository owner and name (e.g., facebook/react or https://github.com/facebook/react).",
    };
  }

  const owner = parts[0];
  const repo = parts[1];

  // Validate characters (GitHub usernames and repos)
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validPattern.test(owner) || !validPattern.test(repo)) {
    return {
      isValid: false,
      error: "Repository and owner names may only contain letters, numbers, hyphens, underscores, or periods.",
    };
  }

  return {
    isValid: true,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
  };
}
