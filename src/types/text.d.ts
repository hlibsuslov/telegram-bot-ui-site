// Plain-text files import as their contents (turbopack rule "*.txt" -> raw in next.config.ts).
declare module "*.txt" {
  const text: string;
  export default text;
}
