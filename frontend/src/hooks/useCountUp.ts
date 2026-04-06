import { useEffect, useRef, useState } from "react";

/**
 * Hook para animar números contando desde 0 hasta el valor final
 * Útil para KPIs y métricas que necesitan transiciones suaves
 */
export function useCountUp(
  end: number,
  duration: number = 1.5,
  start: number = 0
): number {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);

  useEffect(() => {
    if (end === countRef.current) return;

    const startTime = Date.now();
    const difference = end - start;
    const stepTime = Math.abs(Math.floor(duration * 1000 / difference));

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / (duration * 1000);

      if (progress >= 1) {
        setCount(end);
        countRef.current = end;
        clearInterval(timer);
      } else {
        const newCount = Math.floor(start + difference * progress);
        setCount(newCount);
        countRef.current = newCount;
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [end, start, duration]);

  return count;
}

/**
 * Hook para animar porcentajes con decimales
 */
export function useCountUpDecimal(
  end: number,
  duration: number = 1.5,
  decimals: number = 2,
  start: number = 0
): string {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);

  useEffect(() => {
    if (end === countRef.current) return;

    const startTime = Date.now();
    const difference = end - start;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      const newCount = start + difference * progress;
      setCount(newCount);
      countRef.current = newCount;

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [end, start, duration, decimals]);

  return count.toFixed(decimals);
}
