/**
 * Browser file and folder drag-and-drop directory traversal utility.
 * Recursively traverses nested folders using HTML5 FileSystem DirectoryEntry APIs,
 * preserving relative paths and handling Chrome/Edge batch reading.
 */

export interface DroppedFileEntry {
  file: File;
  relativePath: string;
}

export interface TraversalResult {
  files: DroppedFileEntry[];
  folderCount: number;
  skippedCount: number;
  totalSizeBytes: number;
  errors: string[];
}

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  ".pnpm-store",
  ".turbo",
]);

/**
 * Traverses DataTransferItemList recursively to extract all files with their relative paths.
 */
export async function traverseDataTransferItems(
  items: DataTransferItemList | DataTransferItem[],
  onProgress?: (foundCount: number, currentFolder: string) => void
): Promise<TraversalResult> {
  const files: DroppedFileEntry[] = [];
  let folderCount = 0;
  let skippedCount = 0;
  let totalSizeBytes = 0;
  const errors: string[] = [];

  const queue: Array<{ entry: any; relativeDir: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;

    // Use webkitGetAsEntry if supported
    if (typeof item.webkitGetAsEntry === "function") {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        queue.push({ entry, relativeDir: "" });
      }
    } else {
      // Fallback to getAsFile
      const file = item.getAsFile();
      if (file) {
        files.push({ file, relativePath: file.name });
        totalSizeBytes += file.size;
      }
    }
  }

  while (queue.length > 0) {
    const { entry, relativeDir } = queue.shift()!;

    if (entry.isFile) {
      try {
        const file = await readFileEntry(entry);
        const relPath = relativeDir
          ? `${relativeDir}/${entry.name}`
          : entry.name;
        const normalizedRel = relPath.replace(/^\//, "");

        files.push({ file, relativePath: normalizedRel });
        totalSizeBytes += file.size;

        if (onProgress && files.length % 20 === 0) {
          onProgress(files.length, relativeDir || "root");
        }
      } catch (err: any) {
        errors.push(`Failed to read file ${entry.name}: ${err?.message || err}`);
        skippedCount++;
      }
    } else if (entry.isDirectory) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        skippedCount++;
        continue;
      }

      folderCount++;
      const currentRelDir = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;

      if (onProgress) {
        onProgress(files.length, currentRelDir);
      }

      try {
        const childEntries = await readAllDirectoryEntries(entry);
        for (const child of childEntries) {
          queue.push({ entry: child, relativeDir: currentRelDir });
        }
      } catch (err: any) {
        errors.push(`Failed to traverse folder ${entry.name}: ${err?.message || err}`);
      }
    }
  }

  return {
    files,
    folderCount,
    skippedCount,
    totalSizeBytes,
    errors,
  };
}

/**
 * Wraps FileSystemFileEntry.file() in a Promise.
 */
function readFileEntry(fileEntry: any): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file: File) => resolve(file),
      (err: any) => reject(err)
    );
  });
}

/**
 * Reads all entries from a FileSystemDirectoryEntry.
 * Chrome/Edge limits readEntries() to 100 entries per call, so we must
 * loop until readEntries returns an empty array.
 */
async function readAllDirectoryEntries(dirEntry: any): Promise<any[]> {
  const dirReader = dirEntry.createReader();
  const entries: any[] = [];

  const readBatch = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      dirReader.readEntries(
        (results: any[]) => resolve(results),
        (err: any) => reject(err)
      );
    });
  };

  let batch = await readBatch();
  while (batch.length > 0) {
    entries.push(...batch);
    batch = await readBatch();
  }

  return entries;
}

/**
 * Fallback for ordinary file input or standard FileList drops.
 */
export function processFileListFallback(fileList: FileList): TraversalResult {
  const files: DroppedFileEntry[] = [];
  let totalSizeBytes = 0;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relPath = (file as any).webkitRelativePath || file.name;
    files.push({ file, relativePath: relPath });
    totalSizeBytes += file.size;
  }

  return {
    files,
    folderCount: 0,
    skippedCount: 0,
    totalSizeBytes,
    errors: [],
  };
}

