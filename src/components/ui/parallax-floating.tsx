"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { useAnimationFrame, useReducedMotion } from "motion/react";

import { useMousePositionRef } from "@/hooks/use-mouse-position-ref";
import { cn } from "@/lib/utils";

// 21st.dev "Parallax Floating" (danielpetho/fancy), adapted: stable ids from
// useId and no movement at all when the viewer prefers reduced motion.

interface FloatingContextType {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps {
  children: ReactNode;
  className?: string;
  sensitivity?: number;
  easingFactor?: number;
}

type Tracked = { element: HTMLDivElement; depth: number; currentPosition: { x: number; y: number } };

const Floating = ({ children, className, sensitivity = 1, easingFactor = 0.05 }: FloatingProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsMap = useRef(new Map<string, Tracked>());
  const mousePositionRef = useMousePositionRef(containerRef);
  const reduceMotion = useReducedMotion();

  const registerElement = useCallback((id: string, element: HTMLDivElement, depth: number) => {
    elementsMap.current.set(id, { element, depth, currentPosition: { x: 0, y: 0 } });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    elementsMap.current.delete(id);
  }, []);

  useAnimationFrame(() => {
    if (!containerRef.current || reduceMotion) return;
    elementsMap.current.forEach((data) => {
      const strength = (data.depth * sensitivity) / 20;
      const dx = mousePositionRef.current.x * strength - data.currentPosition.x;
      const dy = mousePositionRef.current.y * strength - data.currentPosition.y;
      data.currentPosition.x += dx * easingFactor;
      data.currentPosition.y += dy * easingFactor;
      data.element.style.transform = `translate3d(${data.currentPosition.x}px, ${data.currentPosition.y}px, 0)`;
    });
  });

  return (
    <FloatingContext.Provider value={{ registerElement, unregisterElement }}>
      <div ref={containerRef} className={cn("absolute top-0 left-0 h-full w-full", className)}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
};

export default Floating;

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  depth?: number;
}

export const FloatingElement = ({ children, className, depth = 1 }: FloatingElementProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const context = useContext(FloatingContext);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !context) return;
    context.registerElement(id, element, depth);
    return () => context.unregisterElement(id);
  }, [context, id, depth]);

  return (
    <div ref={elementRef} className={cn("absolute will-change-transform", className)}>
      {children}
    </div>
  );
};
