/** Offline build of Studio with the Pulloa bot snapshot. */
export const DEMO_PAGE = "/studio/demo.html";

export const DEMO_BOT_NAME = "Pulloa";
export const DEMO_SCREEN_COUNT = 26;

export const ORDER_STATES = [
  { id: "default", label: "Brewing" },
  { id: "late", label: "Running late" },
  { id: "ready", label: "Ready" },
  { id: "picked", label: "Picked up" },
];

/** The widgets in the live section, in order: what to tap and the states to preview. */
export const LIVE_WIDGETS = [
  {
    id: "order-status",
    hint: "Tap Keep it warm or Help: the bot answers inside the tracker.",
    initialState: "ready",
    states: ORDER_STATES,
  },
  {
    id: "cart",
    hint: "Change quantities, switch to Courier, then check out and wait for the payment.",
    states: [
      { id: "default", label: "Editing" },
      { id: "awaiting", label: "Awaiting payment" },
      { id: "paid", label: "Paid" },
      { id: "empty", label: "Empty" },
    ],
  },
  {
    id: "pickup-time",
    hint: "Pick a time and confirm it. Try 8:30: another guest takes it first.",
    states: [
      { id: "default", label: "Choosing" },
      { id: "chosen", label: "Time chosen" },
      { id: "booked", label: "Booked" },
      { id: "full", label: "Full today" },
    ],
  },
  {
    id: "rate-drink",
    hint: "Choose stars and tags, then send them to get a coupon.",
    states: [
      { id: "default", label: "Not rated" },
      { id: "thanks", label: "5 stars" },
      { id: "sorry", label: "2 stars" },
      { id: "rated", label: "Rated earlier" },
    ],
  },
  {
    id: "happy-hour",
    hint: "Tap Get my code, then tap the code to copy it.",
    states: [
      { id: "default", label: "Running" },
      { id: "ending", label: "Last seconds" },
      { id: "revealed", label: "Code shown" },
      { id: "over", label: "Over" },
    ],
  },
  {
    id: "drink-match",
    hint: "Answer three questions, then add your match to the order.",
    states: [
      { id: "default", label: "Questions" },
      { id: "matched", label: "Match" },
      { id: "added", label: "Added" },
    ],
  },
] as const;

export const AGENT_FLOW = [
  {
    id: "files",
    title: "Open your bot project",
    text: "Open your bot-ui/ folder in local Studio. For an existing aiogram bot, you can import a project from its code first.",
  },
  {
    id: "map",
    title: "Studio builds the map",
    text: "Each screen becomes a chat card. Arrows show where the buttons lead, including both branches of a rule.",
  },
  {
    id: "simulator",
    title: "Test a route in the simulator",
    text: "Start the simulator and tap through the flow as a user. See the messages and transitions that each action triggers.",
  },
  {
    id: "agent-edits",
    title: "Review changes on the map",
    text: "Leave a request on a screen and copy the task for your agent from Changes. Review the edits in Git and check the updated flow in Studio.",
  },
];

export const DEMO_TOUR = [
  {
    hash: "#/map",
    sections: ["map", "screen"],
    title: "Bot map",
    text: "Select a screen to inspect it, or follow My order from the start screen to see both outcomes.",
  },
  {
    hash: "#/simulator",
    sections: ["simulator"],
    title: "Simulator",
    text: "Press START, then place an order as a customer. Open the scenario menu to try a declined payment.",
  },
  {
    hash: "#/screens/entry.start",
    sections: ["screens"],
    title: "Screen editor",
    text: "In Buttons, find Repeat my usual and edit its label. The draft carries over to the map and simulator.",
  },
  {
    hash: "#/task",
    sections: ["task", "changes"],
    title: "Agent task",
    text: "Leave a change request or export a patch for your draft. The agent task lists the requests and names the exported patch.",
  },
] as const;
