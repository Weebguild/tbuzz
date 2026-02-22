import { useEffect, RefObject } from "react";

export function useMousePosition(
  ref: RefObject<HTMLElement | null>,
  callback: (pos: { x: number; y: number }) => void
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      callback({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [ref, callback]);
}
