import { Bubble, ChatFrame, HALF, Key, PAD, T } from "./primitives";

const RIGHT_X = PAD + HALF + 6;

export function BeforeSettings() {
  return (
    <ChatFrame
      id="before"
      height={352}
      title="Without the skill"
      desc="A settings message with a shouting title, five cut-off buttons in one row, a duplicated 'Order placed' message and a stale Pay now button."
    >
      <Bubble y={60} h={84} time="10:02" />
      <T x={30} y={88} weight={700}>
        *** SETTINGS MENU ***
      </T>
      <T x={30} y={109}>
        Please select what you want to do
      </T>
      <T x={30} y={128}>
        from the options below:
      </T>
      {["Notif…", "Lan…", "Del…", "Help", "Close"].map((label, i) => (
        <Key key={label} x={PAD + i * 66.8} w={60.8} y={152} label={label} size={12} />
      ))}
      <Bubble y={200} h={40} time="10:03" />
      <T x={30} y={225}>
        Order placed!
      </T>
      <Bubble y={246} h={40} time="10:03" />
      <T x={30} y={271}>
        Order placed!
      </T>
      <Key y={294} label="Pay now" />
    </ChatFrame>
  );
}

export function AfterSettings() {
  return (
    <ChatFrame
      id="after"
      height={352}
      title="With the skill"
      desc="A clean settings screen: one title, Notifications and Language side by side, a red Delete account button, Back, and a single order card with a green Paid state and Track order."
    >
      <Bubble y={16} h={66} time="10:02" />
      <T x={30} y={42} size={15} weight={700}>
        Settings
      </T>
      <T x={30} y={64}>
        Choose what to change.
      </T>
      <Key y={90} w={HALF} label="Notifications" />
      <Key x={RIGHT_X} y={90} w={HALF} label="Language" />
      <Key y={132} label="Delete account" tone="danger" />
      <Key y={174} label="Back" icon="back" />
      <Bubble y={224} h={66} time="10:03" />
      <T x={30} y={250} weight={700}>
        Order #4821 · €46.74
      </T>
      <T x={30} y={272}>
        Courier · arrives about 10:40
      </T>
      <Key y={298} w={HALF} label="Paid" tone="success" icon="check" />
      <Key x={RIGHT_X} y={298} w={HALF} label="Track order" icon="arrow" iconAfter />
    </ChatFrame>
  );
}

function StreamingBubble({ y }: { y: number }) {
  return (
    <g>
      <Bubble y={y} h={118} />
      {[0, 1, 2].map((i) => (
        <circle key={i} className="chat-dot" cx={32 + i * 9} cy={y + 21} r={3} style={{ fill: "var(--chat-primary)" }} />
      ))}
      <T x={62} y={y + 26} size={13} color="sub">
        Searching 3 sources…
      </T>
      <T x={30} y={y + 54}>
        Here’s a short plan for your release:
      </T>
      <T x={30} y={y + 76}>
        tag the build, run the smoke tests and
        <tspan className="chat-caret" style={{ fill: "var(--chat-primary)" }}>
          {" ▍"}
        </tspan>
      </T>
      <T x={30} y={y + 104} size={11} color="time">
        Draft · updates in place
      </T>
    </g>
  );
}

export function StreamingReply() {
  return (
    <ChatFrame
      id="stream"
      height={246}
      title="Streaming AI reply"
      desc="The user asks to plan the next release. The bot shows a live status, Searching 3 sources, streams the answer into one draft message and offers a Stop button."
    >
      <Bubble x={154} w={190} y={16} h={40} out />
      <T x={170} y={41}>
        Plan our next release
      </T>
      <StreamingBubble y={68} />
      <Key y={194} label="Stop" icon="stop" />
    </ChatFrame>
  );
}

export function AgentApproval() {
  return (
    <ChatFrame
      id="agent"
      height={290}
      title="Agent notification and approval"
      desc="The agent reports Build finished with all checks passed, then asks for approval to deploy one specific commit to production with Approve and Reject buttons and a View the diff link."
    >
      <Bubble y={16} h={68} time="10:12" />
      <circle cx={38} cy={42} r={10} style={{ fill: "var(--chat-success)" }} />
      <path d="M33 42.5l3.5 3.5 6.5-7" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <T x={56} y={41} weight={700}>
        Build finished
      </T>
      <T x={56} y={61} size={12} color="sub">
        web · main · 3 min 41 s · checks passed
      </T>
      <Bubble y={92} h={96} time="10:12" />
      <T x={30} y={118} weight={700}>
        Approval needed
      </T>
      <T x={30} y={140}>
        Deploy web@a1c9f2e to production.
      </T>
      <T x={30} y={162} size={12} color="sub">
        These buttons approve this one action only.
      </T>
      <Key y={196} w={HALF} label="Approve" tone="success" />
      <Key x={RIGHT_X} y={196} w={HALF} label="Reject" tone="danger" />
      <Key y={238} label="View the diff" icon="external" iconAfter />
    </ChatFrame>
  );
}

const STEPS = [
  { label: "Preview", x: PAD, w: 92 },
  { label: "Approve", x: PAD + 100, w: 92 },
  { label: "Publish once", x: PAD + 200, w: 128 },
];

export function ChannelPost() {
  return (
    <ChatFrame
      id="channel"
      height={412}
      title="Channel post: preview, approve, publish once"
      desc="A channel post is shown as a preview first, the bot asks whether to publish it at 09:00 with Publish and Edit buttons, and a timeout is checked before any retry so the post goes out once."
    >
      {STEPS.map((step, i) => (
        <g key={step.label} className={`chat-step chat-step-${i + 1}`}>
          <rect x={step.x} y={14} width={step.w} height={26} rx={13} style={{ fill: "var(--chat-bubble)" }} />
          <T x={step.x + step.w / 2} y={31} size={12} weight={600} anchor="middle" color={i === 2 ? "link" : "text"}>
            {`${i + 1}  ${step.label}`}
          </T>
        </g>
      ))}
      <Bubble y={52} h={190} time="09:00" />
      <circle cx={40} cy={76} r={12} style={{ fill: "var(--chat-primary)" }} />
      <text x={40} y={76} dy="0.35em" textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
        A
      </text>
      <T x={60} y={74} weight={700}>
        Acme updates
      </T>
      <T x={60} y={90} size={11} color="sub">
        channel · preview, not published yet
      </T>
      <rect x={28} y={102} width={304} height={64} rx={10} style={{ fill: "var(--chat-chip)" }} />
      <T x={44} y={140} size={18} weight={700} color="link">
        Version 3.2
      </T>
      <T x={30} y={190} weight={700}>
        Version 3.2 is out
      </T>
      <T x={30} y={210}>
        Dark mode, faster search and a new
      </T>
      <T x={30} y={229}>
        onboarding. Notes below.
      </T>
      <Key y={248} label="Read the notes" icon="external" iconAfter />
      <Bubble y={296} h={56} />
      <T x={30} y={318} size={13} weight={700}>
        Publish to the channel at 09:00?
      </T>
      <T x={30} y={338} size={12} color="sub">
        A timeout is checked before any retry.
      </T>
      <Key y={360} w={HALF} label="Publish" tone="success" />
      <Key x={RIGHT_X} y={360} w={HALF} label="Edit" />
    </ChatFrame>
  );
}

const ROWS = [
  { metric: "Orders", value: "1,284", change: "+8%" },
  { metric: "Revenue", value: "€18.2k", change: "+5%" },
  { metric: "Returns", value: "12", change: "−2" },
];

const TRACK = [
  { label: "Paid", x: 44 },
  { label: "Packed", x: 128 },
  { label: "On the way", x: 212 },
  { label: "Delivered", x: 296 },
];

export function RichAndWidget() {
  return (
    <ChatFrame
      id="rich"
      height={426}
      title="Rich message with a table, and an HTML widget card"
      desc="A weekly report with a compact three-column table and an expandable quote, followed by an order widget with a four-step progress track, the courier's arrival time and a Track on map button."
    >
      <Bubble y={16} h={194} time="18:00" />
      <T x={30} y={42} size={15} weight={700}>
        Weekly report
      </T>
      <rect x={30} y={54} width={300} height={26} rx={6} style={{ fill: "var(--chat-chip)" }} />
      <T x={40} y={71} size={12} weight={600} color="sub">
        Metric
      </T>
      <T x={238} y={71} size={12} weight={600} color="sub" anchor="end">
        This week
      </T>
      <T x={320} y={71} size={12} weight={600} color="sub" anchor="end">
        Change
      </T>
      {ROWS.map((row, i) => {
        const top = 80 + i * 26;
        return (
          <g key={row.metric}>
            {i > 0 ? <line x1={30} x2={330} y1={top} y2={top} strokeWidth={1} style={{ stroke: "var(--chat-line)" }} /> : null}
            <T x={40} y={top + 18} size={13}>
              {row.metric}
            </T>
            <T x={238} y={top + 18} size={13} anchor="end">
              {row.value}
            </T>
            <T x={320} y={top + 18} size={13} weight={600} anchor="end" color={i < 2 ? "success" : "sub"}>
              {row.change}
            </T>
          </g>
        );
      })}
      <rect x={30} y={166} width={3} height={34} rx={1.5} style={{ fill: "var(--chat-quote)" }} />
      <T x={42} y={180} size={13}>
        Top request: dark mode
      </T>
      <T x={42} y={197} size={12} weight={600} color="link">
        Show more
      </T>

      <Bubble y={222} h={188} />
      <rect x={30} y={236} width={86} height={20} rx={10} style={{ fill: "var(--chat-chip)" }} />
      <T x={73} y={250} size={11} weight={600} color="sub" anchor="middle">
        HTML widget
      </T>
      <T x={30} y={282} size={15} weight={700}>
        Order #4821
      </T>
      <T x={330} y={282} weight={700} anchor="end">
        €46.74
      </T>
      <line x1={44} x2={296} y1={304} y2={304} strokeWidth={3} strokeLinecap="round" style={{ stroke: "var(--chat-line)" }} />
      <line
        className="chat-type"
        x1={44}
        x2={212}
        y1={304}
        y2={304}
        strokeWidth={3}
        strokeLinecap="round"
        style={{ stroke: "var(--chat-primary)" }}
      />
      {TRACK.map((step, i) => (
        <g key={step.label}>
          <circle
            cx={step.x}
            cy={304}
            r={7}
            strokeWidth={2}
            style={{ fill: i < 3 ? "var(--chat-primary)" : "var(--chat-bubble)", stroke: i < 3 ? "var(--chat-primary)" : "var(--chat-line)" }}
          />
          <T x={step.x} y={328} size={11} color={i === 2 ? "text" : "sub"} weight={i === 2 ? 600 : 400} anchor="middle">
            {step.label}
          </T>
        </g>
      ))}
      <T x={30} y={356} size={13}>
        Courier · arrives about 10:40
      </T>
      <rect x={30} y={368} width={300} height={30} rx={8} style={{ fill: "var(--chat-primary)" }} />
      <text x={180} y={383} dy="0.35em" textAnchor="middle" fontSize={13} fontWeight={600} fill="#fff">
        Track on map
      </text>
    </ChatFrame>
  );
}
