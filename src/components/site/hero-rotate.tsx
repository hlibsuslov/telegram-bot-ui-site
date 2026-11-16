"use client";

import { useReducedMotion } from "motion/react";
import { TextRotate } from "@/components/ui/text-rotate";

/** Rotating end of the headline; stays on the first phrase with reduced motion. */
export function HeroRotate({ texts }: { texts: string[] }) {
  const reduceMotion = useReducedMotion();
  return (
    <TextRotate
      texts={texts}
      auto={!reduceMotion}
      rotationInterval={2800}
      staggerDuration={0.02}
      staggerFrom="last"
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      mainClassName="justify-center overflow-hidden pb-1 text-brand sm:pb-2"
    />
  );
}
