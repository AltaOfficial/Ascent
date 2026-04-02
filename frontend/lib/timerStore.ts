import { create } from "zustand";

export type ActiveEntry = { id: string; taskId: string; startedAt: string };
export type ActiveTask = { id: string; title: string; estimatedMinutes: number | null };

type TimerStore = {
  activeEntry: ActiveEntry | null;
  activeTask: ActiveTask | null;
  setActive: (entry: ActiveEntry, task: ActiveTask) => void;
  clear: () => void;
};

export const useTimerStore = create<TimerStore>()((set) => ({
  activeEntry: null,
  activeTask: null,
  setActive: (entry, task) => set({ activeEntry: entry, activeTask: task }),
  clear: () => set({ activeEntry: null, activeTask: null }),
}));
