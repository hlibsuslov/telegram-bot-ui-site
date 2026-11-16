import { Bubble, ChatFrame, Key, T } from "./primitives";

// Small 240-unit chat fragments that float around the hero. Decorative: the
// hero wraps them in aria-hidden, and the full demos below carry the meaning.
const W = 240;
const P = 12;
const IN = W - P * 2;
const HALF = (IN - 6) / 2;
const RIGHT = P + HALF + 6;

export function CardApprove() {
  return (
    <ChatFrame id="hc-approve" width={W} height={124} title="Build finished, approve or reject" desc="">
      <Bubble x={P} y={12} w={IN} h={58} />
      <circle cx={P + 18} cy={34} r={8} style={{ fill: "var(--chat-success)" }} />
      <path d={`M${P + 14} 34.5l3 3 5-5.5`} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <T x={P + 32} y={38} size={13} weight={700}>
        Build finished
      </T>
      <T x={P + 12} y={60} size={11} color="sub">
        main · all checks passed · 4 min
      </T>
      <Key x={P} y={78} w={HALF} h={32} size={12} label="Approve" tone="success" />
      <Key x={RIGHT} y={78} w={HALF} h={32} size={12} label="Reject" tone="danger" />
    </ChatFrame>
  );
}

export function CardStream() {
  return (
    <ChatFrame id="hc-stream" width={W} height={128} title="Streaming answer with Stop" desc="">
      <Bubble x={P} y={12} w={IN} h={66} />
      {[0, 1, 2].map((i) => (
        <circle key={i} className="chat-dot" cx={P + 14 + i * 7} cy={30} r={2.5} style={{ fill: "var(--chat-primary)" }} />
      ))}
      <T x={P + 38} y={34} size={11} color="sub">
        Searching 3 sources…
      </T>
      <T x={P + 12} y={58} size={12}>
        Tag the build, run the tests
        <tspan className="chat-caret" style={{ fill: "var(--chat-primary)" }}>
          {" ▍"}
        </tspan>
      </T>
      <Key x={P} y={86} w={IN} h={30} size={12} label="Stop" icon="stop" />
    </ChatFrame>
  );
}

export function CardDanger() {
  return (
    <ChatFrame id="hc-danger" width={W} height={154} title="Delete account confirmation" desc="">
      <Bubble x={P} y={12} w={IN} h={56} />
      <T x={P + 12} y={36} size={13} weight={700}>
        Delete account?
      </T>
      <T x={P + 12} y={55} size={11} color="sub">
        This removes your data for good.
      </T>
      <Key x={P} y={76} w={IN} h={30} size={12} label="Yes, delete my account" tone="danger" />
      <Key x={P} y={112} w={IN} h={30} size={12} label="Cancel" />
    </ChatFrame>
  );
}

const TRACK = [P + 18, P + 74, P + 130, P + 186];

export function CardWidget() {
  return (
    <ChatFrame id="hc-widget" width={W} height={120} title="Order widget" desc="">
      <Bubble x={P} y={12} w={IN} h={96} />
      <T x={P + 12} y={36} size={13} weight={700}>
        Order #4821
      </T>
      <T x={W - P - 12} y={36} size={12} weight={700} anchor="end">
        €46.74
      </T>
      <line x1={TRACK[0]} x2={TRACK[3]} y1={58} y2={58} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: "var(--chat-line)" }} />
      <line x1={TRACK[0]} x2={TRACK[2]} y1={58} y2={58} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: "var(--chat-primary)" }} />
      {TRACK.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={58}
          r={5}
          strokeWidth={2}
          style={{ fill: i < 3 ? "var(--chat-primary)" : "var(--chat-bubble)", stroke: i < 3 ? "var(--chat-primary)" : "var(--chat-line)" }}
        />
      ))}
      <T x={P + 12} y={88} size={11} color="sub">
        On the way · arrives about 10:40
      </T>
    </ChatFrame>
  );
}

export function CardTable() {
  const rows = [
    ["Orders", "1,284", "+8%"],
    ["Revenue", "€18.2k", "+5%"],
  ];
  return (
    <ChatFrame id="hc-table" width={W} height={118} title="Weekly report table" desc="">
      <Bubble x={P} y={12} w={IN} h={94} />
      <T x={P + 12} y={34} size={13} weight={700}>
        Weekly report
      </T>
      <rect x={P + 10} y={44} width={IN - 20} height={20} rx={5} style={{ fill: "var(--chat-chip)" }} />
      <T x={P + 18} y={58} size={10} weight={600} color="sub">
        Metric
      </T>
      <T x={W - P - 18} y={58} size={10} weight={600} color="sub" anchor="end">
        Change
      </T>
      {rows.map(([metric, value, change], i) => (
        <g key={metric}>
          <T x={P + 18} y={80 + i * 18} size={11}>
            {metric}
          </T>
          <T x={P + 140} y={80 + i * 18} size={11} anchor="end">
            {value}
          </T>
          <T x={W - P - 18} y={80 + i * 18} size={11} weight={600} color="success" anchor="end">
            {change}
          </T>
        </g>
      ))}
    </ChatFrame>
  );
}

export function CardPublish() {
  return (
    <ChatFrame id="hc-publish" width={W} height={110} title="Publish a channel post once" desc="">
      <Bubble x={P} y={12} w={IN} h={52} />
      <T x={P + 12} y={34} size={12} weight={700}>
        Post to the channel at 09:00?
      </T>
      <T x={P + 12} y={52} size={11} color="sub">
        Preview approved · goes out once
      </T>
      <Key x={P} y={70} w={HALF} h={30} size={12} label="Publish" tone="success" />
      <Key x={RIGHT} y={70} w={HALF} h={30} size={12} label="Edit" />
    </ChatFrame>
  );
}
