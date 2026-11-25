import "server-only";
import { allPackFacets, type FacetMap } from "./emoji-facets";
import { cardPack, getLibraryPack } from "./emoji-library";
import { listedPacks, OTHER } from "./emoji-pack-list";

type Profile = { name: string; category: string; facets: FacetMap; compatible: [string, number][] };

/** Confidence-weighted overlap. A pack with several themes is less specific than a focused one. */
function overlap(a: FacetMap, b: FacetMap, facet: string): number {
  const left = a[facet] ?? [];
  const right = b[facet] ?? [];
  const shared = left.reduce((sum, [id, confidence]) =>
    sum + Math.min(confidence, right.find(([other]) => other === id)?.[1] ?? 0), 0);
  return shared / (Math.max(
    left.reduce((sum, [, c]) => sum + c, 0),
    right.reduce((sum, [, c]) => sum + c, 0),
    1,
  ));
}

export function rankSimilarPacks(source: Profile, candidates: Profile[]): string[] {
  const compatibility = new Map(source.compatible.map(([name, score]) => [name.toLowerCase(), score]));
  return candidates.flatMap((candidate) => {
    const key = candidate.name.toLowerCase();
    if (key === source.name.toLowerCase()) return [];
    const sameCategory = candidate.category === source.category && source.category !== OTHER;
    const sameTopic = overlap(source.facets, candidate.facets, "topic");
    if (!sameCategory && sameTopic < 0.3) return [];
    const likeness =
      sameTopic * 4 + Number(sameCategory) * 1.5
      + overlap(source.facets, candidate.facets, "style") * 2.5
      + overlap(source.facets, candidate.facets, "role") * 0.9
      + overlap(source.facets, candidate.facets, "use") * 0.9
      + overlap(source.facets, candidate.facets, "mood") * 0.6
      + overlap(source.facets, candidate.facets, "motion") * 0.6
      + overlap(source.facets, candidate.facets, "fit") * 0.5
      + overlap(source.facets, candidate.facets, "palette") * 0.3
      + (compatibility.get(key) ?? 0);
    return [{ name: candidate.name, likeness }];
  }).sort((a, b) => b.likeness - a.likeness).map(({ name }) => name);
}

/** Rank from the checked-in taxonomy. Only the chosen card previews need the resolver. */
export async function getSimilarPackCards(name: string) {
  const indexed = new Map(allPackFacets().map((pack) => [pack.name.toLowerCase(), pack]));
  const profiles = listedPacks().map((pack) =>
    indexed.get(pack.name.toLowerCase()) ?? { ...pack, facets: {}, compatible: [] });
  const source = profiles.find((pack) => pack.name.toLowerCase() === name.toLowerCase());
  if (!source) return [];
  const similar = rankSimilarPacks(source, profiles).slice(0, 6);
  const results = await Promise.allSettled(similar.map((candidate) => getLibraryPack(candidate)));
  return results.flatMap((result) => result.status === "fulfilled" && result.value ? [cardPack(result.value.pack)] : []);
}
