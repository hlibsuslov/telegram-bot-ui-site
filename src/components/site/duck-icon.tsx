import Image from "next/image";

export type DuckIconName =
  | "skill"
  | "interfaces"
  | "flows"
  | "channels"
  | "operator"
  | "widgets"
  | "mini-apps"
  | "emoji"
  | "bot-api"
  | "studio"
  | "map"
  | "simulator"
  | "edit-bot"
  | "custom-widgets"
  | "agent-task"
  | "restraint";

export function DuckIcon({ name, className }: { name: DuckIconName; className: string }) {
  return (
    <Image
      src={`/skill-map/${name}.webp`}
      alt=""
      width={96}
      height={96}
      unoptimized
      className={className}
    />
  );
}
