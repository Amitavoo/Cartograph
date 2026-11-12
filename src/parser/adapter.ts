import { FrameworkAdapter } from "./types";

/**
 * Fallback adapter that assumes no framework at all.
 * Used when no specialized adapter is provided or detected.
 */
export class NoFrameworkAdapter implements FrameworkAdapter {
  readonly name = "none";

  detect(_repoPath: string, _files: string[]): boolean {
    return true;
  }
}

/**
 * Default fallback instance.
 */
export const defaultAdapter = new NoFrameworkAdapter();
