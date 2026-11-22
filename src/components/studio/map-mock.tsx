import type { ReactNode } from "react";

// A drawn fragment of the Studio map for the demo bot (Brewline): screens as the messages people
// get, arrows from buttons, a rule with both branches and a request queued for the agent.
// Colours come from the --chat-* and site tokens through `style`, like the other mock-ups.

const v = (name: string) => `var(--${name})`;
const KEY_H = 17;
const LINE_H = 13;
const PAD = 7;

type Key = { label: string; tone?: "primary" | "success" };
type Node = { id: string; kind: string; x: number; y: number; w: number; lines: { text: string; bold?: boolean }[]; keys: Key[][]; widget?: boolean; selected?: boolean };

function nodeHeight(n: Node) {
  return PAD + n.lines.length * LINE_H + (n.widget ? 26 : 0) + 4 + n.keys.length * (KEY_H + 3) + PAD - 3;
}

function MapNode({ n }: { n: Node }) {
  const h = nodeHeight(n);
  let y = n.y + PAD + 10;
  const body: ReactNode[] = n.lines.map((line, i) => (
    <text key={i} x={n.x + PAD} y={y + i * LINE_H} fontSize={9.5} fontWeight={line.bold ? 650 : 400} style={{ fill: v("chat-text") }}>
      {line.text}
    </text>
  ));
  y += n.lines.length * LINE_H - 6;
  if (n.widget) {
    body.push(
      <g key="w">
        <rect x={n.x + PAD} y={y} width={n.w - PAD * 2} height={20} rx={5} style={{ fill: v("chat-chip") }} />
        <rect x={n.x + PAD + 6} y={y + 8} width={(n.w - PAD * 2 - 12) * 0.4} height={4} rx={2} style={{ fill: v("chat-primary") }} />
        <rect x={n.x + PAD + 6 + (n.w - PAD * 2 - 12) * 0.4} y={y + 8} width={(n.w - PAD * 2 - 12) * 0.6} height={4} rx={2} style={{ fill: v("chat-line") }} />
      </g>,
    );
    y += 26;
  }
  y += 4;
  n.keys.forEach((row, r) => {
    const gap = 3;
    const kw = (n.w - PAD * 2 - gap * (row.length - 1)) / row.length;
    row.forEach((k, i) => {
      const kx = n.x + PAD + i * (kw + gap);
      const ky = y + r * (KEY_H + 3);
      const fill = k.tone === "primary" ? v("chat-primary") : k.tone === "success" ? v("chat-success") : v("chat-key");
      body.push(
        <g key={`${r}-${i}`}>
          <rect x={kx} y={ky} width={kw} height={KEY_H} rx={4} style={{ fill, opacity: k.tone ? 1 : 0.85 }} />
          <text x={kx + kw / 2} y={ky + 11.5} fontSize={8.5} fontWeight={500} textAnchor="middle" style={{ fill: "#fff" }}>
            {k.label}
          </text>
        </g>,
      );
    });
  });
  return (
    <g>
      <text x={n.x + 2} y={n.y - 5} fontSize={8} style={{ fill: v("muted-foreground") }}>
        <tspan>{n.kind} </tspan>
        <tspan fontWeight={600} className="font-mono" style={{ fill: v("foreground") }}>
          {n.id}
        </tspan>
      </text>
      {n.selected ? <rect x={n.x - 3} y={n.y - 3} width={n.w + 6} height={h + 6} rx={11} fill="none" strokeWidth={2} style={{ stroke: v("brand") }} /> : null}
      <rect x={n.x} y={n.y} width={n.w} height={h} rx={9} style={{ fill: v("chat-wall") }} />
      <rect x={n.x + 3} y={n.y + 3} width={n.w - 6} height={n.lines.length * LINE_H + (n.widget ? 26 : 0) + 8} rx={7} style={{ fill: v("chat-bubble") }} />
      {body}
    </g>
  );
}

const NODES: Node[] = [
  {
    id: "entry.start", kind: "entry", x: 72, y: 54, w: 168,
    lines: [{ text: "Brewline ☕", bold: true }, { text: "Order ahead and skip the line." }],
    keys: [[{ label: "☕ Menu", tone: "primary" }], [{ label: "Repeat my usual" }], [{ label: "📦 My order" }, { label: "⭐ Loyalty card" }]],
  },
  {
    id: "menu.categories", kind: "menu", x: 300, y: 22, w: 150,
    lines: [{ text: "Menu", bold: true }, { text: "What are we having today?" }],
    keys: [[{ label: "Coffee" }, { label: "Tea & more" }], [{ label: "Bakery" }], [{ label: "← Back" }]],
  },
  {
    id: "checkout.review", kind: "confirmation", x: 528, y: 22, w: 178,
    lines: [{ text: "Your order", bold: true }, { text: "Flat white M, oat milk" }, { text: "Ready at 8:45 · total €6.30" }],
    keys: [[{ label: "Pay €6.30", tone: "success" }], [{ label: "Add a note" }, { label: "Add a pastry" }]],
  },
  {
    id: "order.status", kind: "status", x: 512, y: 196, w: 194, widget: true, selected: true,
    lines: [{ text: "☕ Order #218", bold: true }, { text: "Now: brewing." }],
    keys: [[{ label: "How to get it" }], [{ label: "Refresh" }, { label: "Main menu" }]],
  },
  {
    id: "order.none", kind: "empty", x: 512, y: 338, w: 194,
    lines: [{ text: "No active orders", bold: true }, { text: "Order ahead and follow it here." }],
    keys: [[{ label: "☕ Open the menu", tone: "primary" }]],
  },
];

function Edge({ d, dashed, label, lx, ly }: { d: string; dashed?: boolean; label?: string; lx?: number; ly?: number }) {
  return (
    <g>
      <path d={d} fill="none" strokeWidth={1.3} strokeDasharray={dashed ? "4 3" : undefined} markerEnd="url(#map-arrow)" style={{ stroke: v("muted-foreground") }} />
      {label ? (
        <g>
          <rect x={(lx ?? 0) - label.length * 2.6 - 5} y={(ly ?? 0) - 8} width={label.length * 5.2 + 10} height={13} rx={6.5} style={{ fill: v("card"), stroke: v("border") }} />
          <text x={lx} y={(ly ?? 0) + 1.5} fontSize={8} textAnchor="middle" className="font-mono" style={{ fill: v("muted-foreground") }}>
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function MapMock() {
  return (
    <svg viewBox="0 0 720 420" role="img" aria-labelledby="map-mock-title map-mock-desc" className="block h-auto w-full select-none font-sans">
      <title id="map-mock-title">The Studio map of the Brewline demo bot</title>
      <desc id="map-mock-desc">
        Five screens drawn as Telegram messages. Arrows lead from the start screen’s buttons to the menu and the order review. “My order” goes
        through a rule: with an active order to the order status screen, otherwise to the empty state, which has a request queued for the agent.
      </desc>
      <defs>
        <pattern id="map-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" style={{ fill: v("border") }} />
        </pattern>
        <marker id="map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 8 4 0 8z" style={{ fill: v("muted-foreground") }} />
        </marker>
      </defs>
      <rect width="720" height="420" rx="16" style={{ fill: v("card") }} />
      <rect width="720" height="420" rx="16" fill="url(#map-dots)" />

      {/* entry command */}
      <rect x={10} y={88} width={44} height={17} rx={8.5} style={{ fill: v("foreground") }} />
      <text x={32} y={99.5} fontSize={8.5} textAnchor="middle" className="font-mono" style={{ fill: v("background") }}>
        /start
      </text>
      <Edge d="M54 96.5 L70 96.5" />

      <Edge d="M240 107 C 270 107, 270 70, 298 70" />
      <Edge d="M240 127 C 380 175, 450 92, 526 80" />
      <Edge d="M240 147 C 270 147, 262 262, 292 262" />
      <Edge d="M300 129 C 250 129, 200 18, 156 50" dashed label="back" lx={238} ly={26} />

      {/* rule */}
      <path d="M322 244 L352 262 L322 280 L292 262 Z" style={{ fill: v("card"), stroke: v("brand") }} strokeWidth={1.3} />
      <text x={322} y={265} fontSize={8} textAnchor="middle" fontWeight={600} style={{ fill: v("brand") }}>
        rule
      </text>
      <text x={322} y={296} fontSize={8} textAnchor="middle" className="font-mono" style={{ fill: v("muted-foreground") }}>
        order.active = true
      </text>
      <Edge d="M352 262 C 420 262, 440 232, 510 232" label="match" lx={432} ly={246} />
      <Edge d="M322 280 C 322 360, 420 372, 510 372" label="otherwise" lx={404} ly={362} />

      {NODES.map((n) => (
        <MapNode key={n.id} n={n} />
      ))}

      {/* selection toolbar on order.status */}
      <g>
        <rect x={622} y={174} width={84} height={16} rx={5} style={{ fill: v("foreground") }} />
        <text x={664} y={185} fontSize={8} textAnchor="middle" style={{ fill: v("background") }}>
          Copy ID · Ask agent
        </text>
      </g>

      {/* request queued for the agent */}
      <g>
        <rect x={86} y={330} width={196} height={56} rx={9} style={{ fill: v("card"), stroke: v("border") }} />
        <rect x={86} y={330} width={4} height={56} rx={2} style={{ fill: v("brand") }} />
        <text x={98} y={347} fontSize={8} fontWeight={600} style={{ fill: v("brand") }}>
          Request for your agent · order.none
        </text>
        <text x={98} y={361} fontSize={9} style={{ fill: v("foreground") }}>
          “Suggest the guest’s usual here,
        </text>
        <text x={98} y={374} fontSize={9} style={{ fill: v("foreground") }}>
          with a Repeat button.”
        </text>
        <path d="M282 358 C 400 400, 440 396, 510 380" fill="none" strokeWidth={1} strokeDasharray="2 3" style={{ stroke: v("brand") }} />
      </g>
    </svg>
  );
}
