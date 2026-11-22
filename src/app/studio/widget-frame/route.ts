// The same one-time load protocol as the local Studio's preview-frame.html.
const frame = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Widget preview</title></head>
  <body><script>
    addEventListener("message", function load(event) {
      if (event.source !== parent || event.origin !== location.origin ||
          event.data?.k !== "load" || typeof event.data.doc !== "string") return;
      removeEventListener("message", load);
      document.open();
      document.write(event.data.doc);
      document.close();
    });
    parent.postMessage({ k: "frame-ready" }, location.origin);
  </script></body>
</html>`;

export function GET() {
  return new Response(frame, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
    },
  });
}
