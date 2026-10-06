"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableRender = {
  setNodeRef: (node: HTMLElement | null) => void;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
};

/** Thin render-prop wrapper around dnd-kit's useSortable. */
export function SortableItem({
  id,
  data,
  disabled,
  children,
}: {
  id: string;
  data: Record<string, unknown>;
  disabled?: boolean;
  children: (sortable: SortableRender) => ReactNode;
}) {
  const sortable = useSortable({ id, data, disabled });
  return children({
    setNodeRef: sortable.setNodeRef,
    setActivatorNodeRef: sortable.setActivatorNodeRef,
    attributes: sortable.attributes,
    listeners: sortable.listeners,
    isDragging: sortable.isDragging,
    style: {
      transform: CSS.Transform.toString(sortable.transform),
      transition: sortable.transition,
      opacity: sortable.isDragging ? 0.35 : undefined,
    },
  });
}

/** A drop area so empty sections can still receive tasks. */
export function DroppableArea({
  id,
  data,
  children,
}: {
  id: string;
  data: Record<string, unknown>;
  children: (droppable: { setNodeRef: (node: HTMLElement | null) => void; isOver: boolean }) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return children({ setNodeRef, isOver });
}
