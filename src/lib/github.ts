import "server-only";
import { cacheLife } from "next/cache";
import { REPO } from "@/content/site";

/** Star count of the skill repository, or null when GitHub is unreachable or rate-limited.
 *
 *  A count is kept for hours. A failure is kept only for minutes: GitHub's unauthenticated limit is 60 requests an
 *  hour per IP, shared by every build machine and function behind the same address, so a 403 during a build must not
 *  hide the count for hours. GITHUB_TOKEN (optional, any token with public read access) lifts the limit to 5000. */
export async function getStarCount(): Promise<number | null> {
  "use cache";

  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "telegram-bot-ui-site",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data: unknown = await res.json();
      const count = typeof data === "object" && data !== null && "stargazers_count" in data ? data.stargazers_count : null;
      if (typeof count === "number") {
        cacheLife("hours");
        return count;
      }
    }
    console.warn("github stars: no count", res.status, res.headers.get("x-ratelimit-remaining") ?? "");
  } catch (err) {
    console.warn("github stars: request failed", err instanceof Error ? err.name : "unknown error");
  }
  cacheLife("minutes");
  return null;
}
