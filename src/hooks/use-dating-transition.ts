import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Direction = "enter" | "exit";

export function useDatingTransition() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transitioning, setTransitioning] = useState<Direction | null>(null);
  const transitioningRef = useRef<Direction | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const timerId = window.setTimeout(fn, delay);
    timersRef.current.push(timerId);
  }, []);

  useEffect(() => {
    transitioningRef.current = transitioning;
  }, [transitioning]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const enterDating = useCallback(async () => {
    if (transitioningRef.current) return;

    transitioningRef.current = "enter";
    setTransitioning("enter");

    let target = "/dating/discover";

    try {
      if (user) {
        const { data } = await supabase
          .from("dating_profiles")
          .select("id, media, prompts")
          .eq("id", user.id)
          .maybeSingle();

        const hasMedia = Boolean(data && Array.isArray(data.media) && data.media.length > 0);
        const hasPrompts = Boolean(data && data.prompts && Object.keys(data.prompts).length > 0);

        if (!hasMedia || !hasPrompts) {
          target = "/dating/journey";
        }
      }
    } catch {
      // keep fallback route
    }

    schedule(() => {
      navigate(target);
      schedule(() => {
        transitioningRef.current = null;
        setTransitioning(null);
      }, 300);
    }, 850);
  }, [navigate, schedule, user]);

  const exitDating = useCallback(() => {
    if (transitioningRef.current) return;

    transitioningRef.current = "exit";
    setTransitioning("exit");

    schedule(() => {
      navigate("/feed");
    }, 500);

    schedule(() => {
      transitioningRef.current = null;
      setTransitioning(null);
    }, 1000);
  }, [navigate, schedule]);

  return { transitioning, enterDating, exitDating };
}
