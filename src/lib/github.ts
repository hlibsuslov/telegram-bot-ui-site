import "server-only";
import { cacheLife } from "next/cache";
import { REPO } from "@/content/site";

/** Star count of the skill repository, or null when GitHub is unreachable or rate-limited. */
export async function getStarCount(): Promise<number | null> {
  "use cache";
  cacheLife("hours");

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "stargazers_count" in data) {
      const count = data.stargazers_count;
      return typeof count === "number" ? count : null;
    }
    return null;
  } catch {
    return null;
  }
}
