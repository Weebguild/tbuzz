import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type QueueItem = {
  from: string;
  to: string;
  start: number;
  end: number;
  char?: string;
};

interface TextScrambleProps {
  text: string;
  chars?: string;
  className?: string;
  dudClassName?: string;
  /** If true, starts scrambled and reveals on click */
  revealOnClick?: boolean;
}

function randomChar(chars: string) {
  return chars[Math.floor(Math.random() * chars.length)];
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function TextScramble({
  text,
  chars = "!<>-_\\/[]{}—=+*^?#________",
  className = "",
  dudClassName = "text-white/30",
  revealOnClick = false,
}: TextScrambleProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const frameCountRef = useRef(0);
  const [revealed, setRevealed] = useState(!revealOnClick);
  const scrambleIntervalRef = useRef<number | null>(null);

  const cancelFrame = () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
  };

  const scrambleTo = useCallback(
    (newText: string): Promise<void> => {
      const el = containerRef.current!;
      const oldText = el.innerText;
      const length = Math.max(oldText.length, newText.length);
      const q: QueueItem[] = [];

      for (let i = 0; i < length; i++) {
        const from = oldText[i] || "";
        const to = newText[i] || "";
        const start = Math.floor(Math.random() * 40);
        const end = start + Math.floor(Math.random() * 40);
        q.push({ from, to, start, end });
      }

      queueRef.current = q;
      frameCountRef.current = 0;

      return new Promise<void>((resolve) => {
        const step = () => {
          let output = "";
          let complete = 0;
          const queue = queueRef.current;

          for (let i = 0; i < queue.length; i++) {
            const { to, start, end } = queue[i];
            let { char } = queue[i];

            if (frameCountRef.current >= end) {
              complete++;
              output += escapeHtml(to);
            } else if (frameCountRef.current >= start) {
              if (!char || Math.random() < 0.28) {
                char = randomChar(chars);
                queue[i].char = char;
              }
              output += `<span class="${dudClassName}">${escapeHtml(char)}</span>`;
            } else {
              output += escapeHtml(queue[i].from);
            }
          }

          el.innerHTML = output;

          if (complete === queue.length) {
            resolve();
          } else {
            frameCountRef.current++;
            frameRef.current = requestAnimationFrame(step);
          }
        };

        cancelFrame();
        frameRef.current = requestAnimationFrame(step);
      });
    },
    [chars, dudClassName]
  );

  // Static scramble - generate once on mount, not continuously
  const [staticScramble] = useState(() => {
    let output = "";
    for (let i = 0; i < text.length; i++) {
      output += randomChar(chars);
    }
    return output;
  });

  // Set static scramble on mount
  useEffect(() => {
    if (revealed || !containerRef.current) return;
    let html = "";
    for (let i = 0; i < staticScramble.length; i++) {
      html += `<span class="${dudClassName}">${escapeHtml(staticScramble[i])}</span>`;
    }
    containerRef.current.innerHTML = html;
  }, [revealed, staticScramble, dudClassName]);

  // Reveal animation
  useEffect(() => {
    if (revealed && containerRef.current) {
      scrambleTo(text);
    }
    return cancelFrame;
  }, [revealed, text, scrambleTo]);

  const handleClick = () => {
    if (!revealOnClick) return;
    if (!revealed) {
      setRevealed(true);
    } else {
      // Re-scramble back to static state
      setRevealed(false);
    }
  };

  return (
    <span
      ref={containerRef}
      onClick={handleClick}
      className={cn(
        revealOnClick && !revealed && "cursor-pointer",
        className
      )}
      style={{ minHeight: "1em", lineHeight: 1.15, willChange: "contents" }}
      title={revealOnClick && !revealed ? "Tap to reveal your gossip alias" : undefined}
    />
  );
}
