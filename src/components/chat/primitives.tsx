import type { ReactNode } from "react";

/**
 * Hand-drawn chat mock-ups. Every frame is 360 units wide so it renders close
 * to 1:1 on a phone. Colours come from the --chat-* tokens in globals.css and
 * are applied through `style`, because CSS variables are not reliable inside
 * SVG presentation attributes.
 */
export const FRAME_WIDTH = 360;
export const PAD = 16;
export const INNER = FRAME_WIDTH - PAD * 2;
export const HALF = (INNER - 6) / 2;

const c = (name: string) => `var(--chat-${name})`;

export function ChatFrame({
  id,
  title,
  desc,
  height,
  width = FRAME_WIDTH,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  height: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      className="mx-auto block h-auto w-full max-w-[420px] select-none font-sans"
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{desc}</desc>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={{ stopColor: c("wall") }} />
          <stop offset="1" style={{ stopColor: c("wall-2") }} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} rx={20} fill={`url(#${id}-wall)`} />
      {children}
    </svg>
  );
}

type TextProps = {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  className?: string;
};

export function T({ x, y, children, size = 14, weight = 400, color = "text", anchor = "start", className }: TextProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      className={className}
      style={{ fill: c(color) }}
    >
      {children}
    </text>
  );
}

export function Bubble({
  x = PAD,
  y,
  w = INNER,
  h,
  time,
  out = false,
}: {
  x?: number;
  y: number;
  w?: number;
  h: number;
  time?: string;
  out?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} style={{ fill: c(out ? "bubble-out" : "bubble") }} />
      {time ? (
        <T x={x + w - 12} y={y + h - 9} size={11} color="time" anchor="end">
          {time}
        </T>
      ) : null}
    </g>
  );
}

export type Tone = "default" | "primary" | "success" | "danger";

const TONE_FILL: Record<Tone, string> = {
  default: c("key"),
  primary: c("primary"),
  success: c("success"),
  danger: c("danger"),
};

export type IconName = "back" | "check" | "stop" | "arrow" | "external";

function Icon({ name, x, y }: { name: IconName; x: number; y: number }) {
  // 12x12 glyphs drawn around (x, y) as the top-left corner.
  const stroke = { stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <path d={`M${x + 11} ${y + 6}H${x + 1}M${x + 5} ${y + 2}L${x + 1} ${y + 6}L${x + 5} ${y + 10}`} {...stroke} />;
    case "arrow":
      return <path d={`M${x + 1} ${y + 6}H${x + 11}M${x + 7} ${y + 2}L${x + 11} ${y + 6}L${x + 7} ${y + 10}`} {...stroke} />;
    case "check":
      return <path d={`M${x + 1} ${y + 6.5}L${x + 4.5} ${y + 10}L${x + 11} ${y + 2.5}`} {...stroke} />;
    case "external":
      return <path d={`M${x + 3} ${y + 9}L${x + 10} ${y + 2}M${x + 4} ${y + 2}H${x + 10}V${y + 8}`} {...stroke} />;
    case "stop":
      return <rect x={x + 1.5} y={y + 1.5} width={9} height={9} rx={2} fill="currentColor" />;
    default: {
      const unreachable: never = name;
      return unreachable;
    }
  }
}

/** An inline keyboard button with an optional icon before or after the label. */
export function Key({
  x = PAD,
  y,
  w = INNER,
  h = 36,
  label,
  tone = "default",
  icon,
  iconAfter = false,
  size = 13,
}: {
  x?: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  tone?: Tone;
  icon?: IconName;
  iconAfter?: boolean;
  size?: number;
}) {
  const textColor = tone === "default" ? c("key-text") : "#ffffff";
  // Approximate label width keeps the icon next to the centred text.
  const labelWidth = label.length * size * 0.5;
  const gap = icon ? 8 : 0;
  const total = labelWidth + (icon ? 12 + gap : 0);
  const start = x + w / 2 - total / 2;
  const textX = icon && !iconAfter ? start + 12 + gap + labelWidth / 2 : start + labelWidth / 2;
  const iconX = iconAfter ? start + labelWidth + gap : start;
  return (
    <g style={{ color: textColor }}>
      <rect x={x} y={y} width={w} height={h} rx={10} style={{ fill: TONE_FILL[tone] }} />
      {icon ? <Icon name={icon} x={iconX} y={y + h / 2 - 6} /> : null}
      <text
        x={textX}
        y={y + h / 2}
        dy="0.35em"
        fontSize={size}
        fontWeight={tone === "default" ? 500 : 600}
        textAnchor="middle"
        style={{ fill: textColor }}
      >
        {label}
      </text>
    </g>
  );
}
