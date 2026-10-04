// Helpers for drag-and-drop ordering of tasks and sections.

/**
 * Moves `id` so it sits right before `beforeId` (or at the end when null).
 * Returns a new array; the original is untouched.
 */
export function moveBefore<T extends { id: string }>(
  items: T[],
  id: string,
  beforeId: string | null,
): T[] {
  const moving = items.find((item) => item.id === id);
  if (!moving || id === beforeId) return items;
  const rest = items.filter((item) => item.id !== id);
  const index = beforeId ? rest.findIndex((item) => item.id === beforeId) : -1;
  if (index === -1) return [...rest, moving];
  return [...rest.slice(0, index), moving, ...rest.slice(index)];
}

/**
 * Places a task into `sectionId` before `beforeTaskId` (null = at the end) and
 * returns the reordered task list plus the ids of the target section in their
 * new order — what POST /tasks/reorder expects.
 */
export function moveTask<T extends { id: string; sectionId: string | null }>(
  tasks: T[],
  taskId: string,
  sectionId: string | null,
  beforeTaskId: string | null,
): { tasks: T[]; sectionTaskIds: string[] } {
  const moved = tasks.map((task) =>
    task.id === taskId ? { ...task, sectionId } : task,
  );
  const reordered = moveBefore(moved, taskId, beforeTaskId);
  return {
    tasks: reordered,
    sectionTaskIds: reordered
      .filter((task) => task.sectionId === sectionId)
      .map((task) => task.id),
  };
}

/** True when the pointer is in the top half of the element. */
export function isUpperHalf(event: React.DragEvent<HTMLElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2;
}

/** True when the pointer is in the left half of the element. */
export function isLeftHalf(event: React.DragEvent<HTMLElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2;
}
