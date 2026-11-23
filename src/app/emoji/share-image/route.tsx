import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 84, background: "#17212b", color: "#f5f5f5" }}>
      <div style={{ display: "flex", color: "#78bfff", fontSize: 32, fontWeight: 700 }}>telegram-bot-ui</div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 76, fontWeight: 700 }}>Telegram Emoji Library</div>
      <div style={{ display: "flex", marginTop: 22, fontSize: 34, color: "#cedcea" }}>Find a pack and copy a custom emoji ID.</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
