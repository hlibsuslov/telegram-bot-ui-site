"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DuckIcon, type DuckIconName } from "./duck-icon";
import { Container } from "./section";

type MapNode = { id: DuckIconName; title: string; text: string; href: string };

const ROOT: MapNode = {
  id: "skill",
  title: "telegram-bot-ui",
  text: "The Agent Skill. Your coding agent loads it and routes each task to the right guide.",
  href: "#install",
};

// Wording follows the Capabilities section and the Studio README.
const BRANCHES: MapNode[] = [
  { id: "interfaces", title: "Bot interfaces", text: "Texts, menus, keyboards, colored buttons, forms, streaming replies.", href: "#capabilities" },
  { id: "flows", title: "Product flows", text: "Shops, bookings, support: no stale Pay buttons, no double orders.", href: "#capabilities" },
  { id: "channels", title: "Channel posts", text: "Compose, preview, approve and schedule. Never post twice.", href: "#capabilities" },
  { id: "operator", title: "Agent through a bot", text: "Approval buttons bound to one action, an operator allowlist.", href: "#capabilities" },
  { id: "widgets", title: "HTML widgets", text: "18 ready widgets inside messages, a size check and a preview.", href: "#capabilities" },
  { id: "emoji", title: "Premium emoji", text: "One custom emoji pack across buttons, texts and posts.", href: "#capabilities" },
  { id: "bot-api", title: "The whole Bot API", text: "194 methods and 426 types. Payloads checked before sending.", href: "#capabilities" },
  { id: "studio", title: "bot-ui Studio", text: "A local editor for the bot-ui/ folder in your repository.", href: "#studio" },
];

const STUDIO_BRANCHES: MapNode[] = [
  { id: "map", title: "Bot map", text: "Every screen as a card, arrows to where its buttons lead.", href: "/studio#demo" },
  { id: "simulator", title: "Simulator", text: "Tap through a route as a user, both branches of a rule.", href: "/studio#demo" },
  { id: "edit-bot", title: "Edit an existing bot", text: "Inventory an aiogram bot, then edit its screens. Saves go to your files.", href: "/studio#run" },
  { id: "custom-widgets", title: "Custom widgets", text: "Start blank or from the library. Studio writes widgets/<id>/.", href: "/studio#widgets" },
  { id: "agent-task", title: "Instructions for the agent", text: "Requests on screens become one prompt. The agent commits on a branch.", href: "/studio#run" },
];

const MINI_APPS_ID = "mini-apps";
const MINI_APP_BRANCHES = [
  { id: "mini-apps-create", title: "Create a Mini App", text: "Design screens and launch them in Telegram." },
  { id: "mini-apps-edit", title: "Edit an existing app", text: "Improve layouts, navigation and components." },
  { id: "mini-apps-review", title: "Review the UI", text: "Check themes, safe areas and native controls." },
];

const ROOT_BRANCH_IDS = [MINI_APPS_ID, ...BRANCHES.map((b) => b.id)];
const BRANCH_GROUPS = [
  { id: MINI_APPS_ID, leaves: MINI_APP_BRANCHES },
  { id: "studio", leaves: STUDIO_BRANCHES },
];

type Edge = { from: string; to: string };

const EDGES: Edge[] = [
  ...ROOT_BRANCH_IDS.map((id) => ({ from: ROOT.id, to: id })),
  ...BRANCH_GROUPS.flatMap((group) => group.leaves.map((leaf) => ({ from: group.id, to: leaf.id }))),
];

/** Leaves in tour order, each with the edges from the root down to it. */
const ROUTES: { id: string; edges: string[] }[] = [
  ...MINI_APP_BRANCHES.map((b) => ({ id: b.id, edges: [`${ROOT.id}>${MINI_APPS_ID}`, `${MINI_APPS_ID}>${b.id}`] })),
  ...BRANCHES.filter((b) => b.id !== "studio").map((b) => ({ id: b.id, edges: [`${ROOT.id}>${b.id}`] })),
  ...STUDIO_BRANCHES.map((b) => ({ id: b.id, edges: [`${ROOT.id}>studio`, `studio>${b.id}`] })),
];

const STEP_MS = 2600;
const DRAW_MS = 700;

function edgeKey(e: Edge) {
  return `${e.from}>${e.to}`;
}

function edgeDelay(index: number) {
  // Draw the branches from the root, then the branches from each group.
  const rootCount = ROOT_BRANCH_IDS.length;
  return index < rootCount ? index * 110 : rootCount * 110 + DRAW_MS * 0.6 + (index - rootCount) * 120;
}

function nodeDelay(id: string) {
  if (id === ROOT.id) return 0;
  const i = EDGES.findIndex((e) => e.to === id);
  return edgeDelay(i) + DRAW_MS * 0.7;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Curves between nodes, measured from the DOM so the tree fits any width. */
function usePaths(ref: React.RefObject<HTMLDivElement | null>) {
  const [paths, setPaths] = useState<{ d: Record<string, string>; w: number; h: number }>({ d: {}, w: 0, h: 0 });

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      const box = root.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const rect = (id: string, part: "node" | "icon") => {
        const el = root.querySelector<HTMLElement>(`[data-node="${id}"]${part === "icon" ? " [data-icon]" : ""}`);
        const r = el?.getBoundingClientRect();
        return r ? { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top } : null;
      };
      const d: Record<string, string> = {};
      for (const e of EDGES) {
        const fromNode = rect(e.from, "node");
        const fromIcon = rect(e.from, "icon");
        const toNode = rect(e.to, "node");
        const toIcon = rect(e.to, "icon");
        if (!fromNode || !fromIcon || !toNode || !toIcon) continue;
        const ty = (toIcon.t + toIcon.b) / 2;
        if (wide) {
          const x1 = fromNode.r;
          const y1 = (fromIcon.t + fromIcon.b) / 2;
          const x2 = toNode.l;
          const mid = (x1 + x2) / 2;
          d[edgeKey(e)] = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${ty}, ${x2} ${ty}`;
        } else {
          const x1 = (fromIcon.l + fromIcon.r) / 2;
          const y1 = fromIcon.b;
          const x2 = toNode.l;
          const r = Math.min(14, Math.max(0, (x2 - x1) / 2), Math.max(0, ty - y1));
          d[edgeKey(e)] = `M ${x1} ${y1} V ${ty - r} Q ${x1} ${ty} ${x1 + r} ${ty} H ${x2}`;
        }
      }
      setPaths({ d, w: box.width, h: box.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [ref]);

  return paths;
}

function NodeCard({
  node,
  kind,
  shown,
  active,
  onActivate,
}: {
  node: MapNode;
  kind: "root" | "branch" | "studio" | "leaf";
  shown: boolean;
  active: boolean;
  onActivate: (id: string | null) => void;
}) {
  const big = kind === "root" || kind === "studio";
  return (
    <a
      href={node.href}
      data-node={node.id}
      onMouseEnter={() => onActivate(node.id)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(node.id)}
      onBlur={() => onActivate(null)}
      style={{ transitionDelay: shown ? `${nodeDelay(node.id)}ms` : "0ms" }}
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-xl border bg-card p-2.5 pr-3.5 transition-[opacity,translate,border-color,box-shadow] duration-500 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
        active ? "border-brand/60 shadow-[0_0_0_3px] shadow-brand/12" : "border-border hover:border-brand/40",
        kind === "root" && "lg:flex-col lg:items-start lg:p-4",
        kind === "studio" && "border-brand/40 bg-brand/[0.04]",
      )}
    >
      <span
        data-icon
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-brand/6 transition-colors duration-300",
          big ? "size-14" : "size-12",
          active && "bg-brand/12",
        )}
      >
        <DuckIcon name={node.id} className={big ? "size-11" : "size-9"} />
      </span>
      <span className="min-w-0">
        <span className={cn("block leading-snug font-semibold", kind === "root" ? "text-lg" : "text-sm")}>{node.title}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-5 text-muted-foreground">{node.text}</span>
      </span>
    </a>
  );
}

function MiniAppsBranch({
  activeNodes,
  onActivate,
}: {
  activeNodes: ReadonlySet<string>;
  onActivate: (id: string | null) => void;
}) {
  return (
    <section
      id={MINI_APPS_ID}
      aria-labelledby="mini-apps-heading"
      className="grid scroll-mt-24 gap-y-3 pl-12 lg:col-span-2 lg:grid-cols-subgrid lg:pl-0"
    >
      <div
        data-node={MINI_APPS_ID}
        className="flex min-w-0 items-center gap-3 lg:self-center"
        onMouseEnter={() => onActivate(MINI_APPS_ID)}
        onMouseLeave={() => onActivate(null)}
      >
        <span data-icon className="grid size-12 shrink-0 place-items-center">
          <DuckIcon name={MINI_APPS_ID} className="size-11" />
        </span>
        <div className="min-w-0">
          <h3 id="mini-apps-heading" className="text-base leading-snug font-semibold text-brand">Mini Apps</h3>
          <p className="mt-0.5 text-[0.8125rem] leading-5 text-muted-foreground">Telegram design guidelines and a ready-to-use UI kit.</p>
        </div>
      </div>
      <ul className="grid gap-3 pl-12 lg:pl-0">
        {MINI_APP_BRANCHES.map((leaf) => (
          <li
            key={leaf.id}
            data-node={leaf.id}
            className="flex min-w-0 items-start gap-2.5"
            onMouseEnter={() => onActivate(leaf.id)}
            onMouseLeave={() => onActivate(null)}
          >
            <span
              data-icon
              aria-hidden="true"
              className={cn("mt-1.5 size-2 shrink-0 rounded-full border border-brand/55", activeNodes.has(leaf.id) && "border-brand bg-brand")}
            />
            <div className="min-w-0">
              <p className="text-sm leading-5 font-semibold">{leaf.title}</p>
              <p className="text-[0.8125rem] leading-5 text-muted-foreground">{leaf.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SkillMap() {
  const treeRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const paths = usePaths(treeRef);
  const [inView, setInView] = useState(false);
  const [tour, setTour] = useState(-1);
  const [hovered, setHovered] = useState<string | null>(null);

  const shown = inView || reduced;

  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // After the tree has drawn itself, walk the branches one by one; hovering takes over.
  useEffect(() => {
    if (!inView || reduced || hovered) return;
    const start = window.setTimeout(
      () => setTour((t) => (t + 1) % ROUTES.length),
      tour < 0 ? edgeDelay(EDGES.length - 1) + DRAW_MS + 200 : STEP_MS,
    );
    return () => window.clearTimeout(start);
  }, [inView, reduced, hovered, tour]);

  const activeId = hovered ?? (tour >= 0 ? ROUTES[tour].id : null);
  const activeGroup = BRANCH_GROUPS.find((group) => group.id === activeId);
  const activeEdges = new Set<string>(
    activeId === ROOT.id
      ? [`${ROOT.id}>studio`]
      : activeGroup
        ? [`${ROOT.id}>${activeGroup.id}`, ...activeGroup.leaves.map((leaf) => `${activeGroup.id}>${leaf.id}`)]
        : (ROUTES.find((r) => r.id === activeId)?.edges ?? []),
  );
  const activeNodes = new Set<string>(activeId ? [ROOT.id, ...[...activeEdges].map((k) => k.split(">")[1]), activeId] : []);
  if (activeId === ROOT.id) activeNodes.delete("studio");
  const route = activeId && !hovered && !reduced ? ROUTES.find((r) => r.id === activeId) : undefined;
  const routeD = route?.edges.map((k) => paths.d[k]).filter(Boolean).join(" ");

  return (
    <section id="skill-map" aria-labelledby="skill-map-heading" className="py-16 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium text-brand">Skill map</p>
          <h2 id="skill-map-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            One skill, and everywhere it takes your bot.
          </h2>
          <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
            Follow a branch from the skill to the work your agent takes on. Studio branches again: a map and a simulator for your
            bot, editing a bot you already run, custom widgets and instructions for your coding agent.
          </p>
        </div>

        <div ref={treeRef} className="relative mt-12">
          <svg
            aria-hidden="true"
            width={paths.w}
            height={paths.h}
            className="pointer-events-none absolute inset-0 overflow-visible text-border"
            fill="none"
          >
            {EDGES.map((e, i) => {
              const key = edgeKey(e);
              const d = paths.d[key];
              if (!d) return null;
              const active = activeEdges.has(key);
              return (
                <g key={key}>
                  <path d={d} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                  <path
                    d={d}
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={shown ? 0 : 1}
                    strokeWidth={active ? 2.25 : 1.5}
                    strokeLinecap="round"
                    className={cn(
                      "transition-[stroke-dashoffset,stroke,stroke-width] ease-out motion-reduce:transition-none",
                      active ? "stroke-brand" : "stroke-brand/35",
                    )}
                    style={{
                      transitionDuration: `${DRAW_MS}ms, 300ms, 300ms`,
                      transitionDelay: shown && !reduced ? `${edgeDelay(i)}ms, 0ms, 0ms` : "0ms",
                    }}
                  />
                </g>
              );
            })}
            {routeD ? (
              <circle key={`${activeId}-${tour}`} r={4} className="fill-brand">
                <animateMotion dur={`${route!.edges.length * 0.9}s`} path={routeD} fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
              </circle>
            ) : null}
          </svg>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,19rem)_minmax(0,19rem)] lg:justify-between lg:gap-x-10">
            <div className="lg:row-span-2 lg:self-center">
              <NodeCard node={ROOT} kind="root" shown={shown} active={activeNodes.has(ROOT.id)} onActivate={setHovered} />
            </div>
            <MiniAppsBranch activeNodes={activeNodes} onActivate={setHovered} />
            <ul className="grid gap-2.5 pl-12 lg:pl-0">
              {BRANCHES.map((node) => (
                <li key={node.id}>
                  <NodeCard
                    node={node}
                    kind={node.id === "studio" ? "studio" : "branch"}
                    shown={shown}
                    active={activeNodes.has(node.id)}
                    onActivate={setHovered}
                  />
                </li>
              ))}
            </ul>
            <div className="-mt-3.5 pl-24 lg:mt-0 lg:self-end lg:pl-0">
              <p className="mb-3 hidden text-sm font-medium text-brand lg:block">Inside Studio</p>
              <ul className="grid gap-2.5" aria-label="Inside bot-ui Studio">
                {STUDIO_BRANCHES.map((node) => (
                  <li key={node.id}>
                    <NodeCard node={node} kind="leaf" shown={shown} active={activeNodes.has(node.id)} onActivate={setHovered} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
