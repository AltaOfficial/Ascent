type FolderLink = { id: string; parentId: string | null };

/**
 * True when putting `folderId` inside `newParentId` would make a folder its
 * own ancestor (dropping a folder into itself or one of its descendants).
 */
export function wouldCreateCycle(
  folders: FolderLink[],
  folderId: string,
  newParentId: string | null,
): boolean {
  const parentOf = new Map(folders.map((f) => [f.id, f.parentId]));
  const seen = new Set<string>();
  let current = newParentId;
  while (current) {
    if (current === folderId) return true;
    if (seen.has(current)) return true; // already corrupt; refuse
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

/** All folder ids nested (at any depth) under `folderId`, excluding itself. */
export function descendantIds(
  folders: FolderLink[],
  folderId: string,
): string[] {
  const result: string[] = [];
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const folder of folders) {
      if (folder.parentId === current && !result.includes(folder.id)) {
        result.push(folder.id);
        queue.push(folder.id);
      }
    }
  }
  return result;
}
