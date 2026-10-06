"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  closestCorners,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { apiFetch } from "@/lib/api";

// Drag-and-drop for a project's sections and their tasks (Board and List
// views), using dnd-kit's multiple-container sortable pattern:
//   task ids      → `task:<id>`      data { type: "task", sectionId }
//   section ids   → `section:<id>`   data { type: "section" }
//   empty columns → `container:<id>` data { type: "container", sectionId }

type Section = { id: string };
type Task = { id: string; sectionId: string | null };

export const taskDndId = (id: string) => `task:${id}`;
export const sectionDndId = (id: string) => `section:${id}`;
export const containerDndId = (id: string) => `container:${id}`;
const rawId = (dndId: string | number) => String(dndId).split(":")[1];

export function useSectionTaskDnd<S extends Section, T extends Task>({
  projectId,
  sections,
  setSections,
  tasks,
  setTasks,
}: {
  projectId: string;
  sections: S[];
  setSections: (next: S[]) => void;
  tasks: T[];
  setTasks: (next: T[] | ((prev: T[]) => T[])) => void;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  // Restore point if the server rejects a move
  const [snapshot, setSnapshot] = useState<T[] | null>(null);

  // Collision detection from dnd-kit's MultipleContainers example. Moving a
  // card into another column changes the layout; with corner/centre-based
  // detection the card can then "belong" to its old column again on the next
  // frame and bounce between the two forever (React: "Maximum update depth").
  // Using the pointer position, remembering the last target while over a gap,
  // and ignoring the frame right after a column change avoids that.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [tasks]);

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // Columns only collide with other columns: the one under the pointer
      if (args.active.data.current?.type === "section") {
        const sectionArgs = {
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.data.current?.type === "section",
          ),
        };
        const underPointer = pointerWithin(sectionArgs);
        return underPointer.length > 0 ? underPointer : closestCorners(sectionArgs);
      }

      // Right after a column change the cards' measured positions are stale;
      // stay put until they've been re-measured
      if (recentlyMovedToNewContainer.current) return [{ id: args.active.id }];

      const pointerCollisions = pointerWithin(args);
      const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
      let overId = getFirstCollision(collisions, "id");

      if (overId != null) {
        const over = args.droppableContainers.find((container) => container.id === overId);
        const type = over?.data.current?.type;
        if (type === "container" || type === "section") {
          // Over a column: pick the closest card in it, if it has any
          const sectionId = type === "container" ? over?.data.current?.sectionId : rawId(overId);
          const cardsInColumn = args.droppableContainers.filter(
            (container) =>
              container.data.current?.type === "task" &&
              container.data.current?.sectionId === sectionId &&
              container.id !== args.active.id,
          );
          if (cardsInColumn.length > 0) {
            overId = closestCenter({ ...args, droppableContainers: cardsInColumn })[0]?.id ?? overId;
          } else if (type === "section") {
            overId = containerDndId(String(sectionId));
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Between columns: keep the previous target instead of flip-flopping
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [],
  );

  const sensors = useSensors(
    // A small distance keeps plain clicks (open task, rename) working
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type === "task") {
      setActiveTaskId(rawId(active.id));
      setSnapshot(tasks);
    } else if (active.data.current?.type === "section") {
      setActiveSectionId(rawId(active.id));
    }
  }

  // Moving between columns happens while dragging so the card previews in place
  function onDragOver({ active, over }: DragOverEvent) {
    if (active.data.current?.type !== "task" || !over || over.id === active.id) return;
    const overType = over.data.current?.type;
    if (overType !== "task" && overType !== "container") return;
    const movingId = rawId(active.id);
    setTasks((prev) => {
      // Read columns from state: dnd-kit's per-item data can lag a render
      // behind after a card changes column
      const targetSection =
        overType === "task"
          ? prev.find((t) => t.id === rawId(over.id))?.sectionId
          : (over.data.current?.sectionId as string);
      const moving = prev.find((t) => t.id === movingId);
      if (!moving || !targetSection || moving.sectionId === targetSection) return prev;
      recentlyMovedToNewContainer.current = true;
      const rest = prev.filter((t) => t.id !== movingId);
      const moved = { ...moving, sectionId: targetSection };
      if (overType === "task") {
        const index = rest.findIndex((t) => t.id === rawId(over.id));
        return [...rest.slice(0, index), moved, ...rest.slice(index)];
      }
      return [...rest, moved];
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null);
    setActiveSectionId(null);
    const type = active.data.current?.type;

    if (type === "section") {
      if (!over) return;
      // While dragging a column the pointer is often over one of the target
      // column's cards or its drop area; both carry that column's id.
      const overSectionId =
        over.data.current?.type === "section"
          ? rawId(over.id)
          : (over.data.current?.sectionId as string | undefined);
      const from = sections.findIndex((s) => s.id === rawId(active.id));
      const to = sections.findIndex((s) => s.id === overSectionId);
      if (from === to) return;
      if (from < 0 || to < 0) return;
      const previous = sections;
      const next = arrayMove(sections, from, to);
      setSections(next);
      try {
        await apiFetch(`/projects/${projectId}/sections/reorder`, {
          method: "POST",
          body: JSON.stringify({ sectionIds: next.map((s) => s.id) }),
        });
      } catch {
        setSections(previous);
      }
      return;
    }

    if (type !== "task") return;
    const previous = snapshot ?? tasks;
    setSnapshot(null);
    if (!over) {
      setTasks(previous);
      return;
    }
    const movingId = rawId(active.id);
    let next = tasks;
    if (over.data.current?.type === "task" && active.id !== over.id) {
      const from = tasks.findIndex((t) => t.id === movingId);
      const to = tasks.findIndex((t) => t.id === rawId(over.id));
      if (from >= 0 && to >= 0) next = arrayMove(tasks, from, to);
    }
    setTasks(next);
    const sectionId = next.find((t) => t.id === movingId)?.sectionId ?? null;
    try {
      await apiFetch("/tasks/reorder", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          sectionId,
          taskIds: next.filter((t) => t.sectionId === sectionId).map((t) => t.id),
        }),
      });
    } catch {
      setTasks(previous);
    }
  }

  function onDragCancel() {
    if (snapshot) setTasks(snapshot);
    setSnapshot(null);
    setActiveTaskId(null);
    setActiveSectionId(null);
  }

  return {
    sensors,
    collisionDetection,
    // Re-measure card positions as they move between columns
    measuring: { droppable: { strategy: MeasuringStrategy.Always } },
    activeTaskId,
    activeSectionId,
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel },
  };
}
