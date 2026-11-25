// A small JSON Schema (2020-12) validator for the keywords the OpenAPI document uses, so the
// contract tests need no dependency. A schema keyword it does not know fails loudly instead of being
// skipped. Strict mode also rejects object properties a schema does not declare: the document must
// describe every field the handlers send.
import { isDeepStrictEqual } from "node:util";

type Schema = boolean | Record<string, unknown>;

const ANNOTATIONS = ["description", "title", "examples", "default", "deprecated", "readOnly", "writeOnly", "format",
  "contentMediaType", "contentEncoding", "$comment"];
const KEYWORDS = new Set(["$ref", "type", "enum", "const", "properties", "required", "additionalProperties", "items", "prefixItems",
  "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "pattern", "oneOf", "anyOf", "allOf", "propertyNames", ...ANNOTATIONS]);
const TYPES = new Set(["string", "number", "integer", "boolean", "object", "array", "null"]);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The target of a local reference like "#/components/schemas/Pack". */
export function resolveRef(root: unknown, ref: string): unknown {
  if (!ref.startsWith("#/")) throw new Error(`only local references are supported: ${ref}`);
  let node: unknown = root;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isObject(node) || !(key in node)) throw new Error(`unresolved reference ${ref}`);
    node = node[key];
  }
  return node;
}

/** Problems with a schema itself: unknown keywords, malformed values, unresolved references. */
export function schemaProblems(schema: unknown, root: unknown, at = "#"): string[] {
  if (typeof schema === "boolean") return [];
  if (!isObject(schema)) return [`${at}: a schema is an object or a boolean`];
  const out: string[] = [];
  for (const k of Object.keys(schema)) if (!KEYWORDS.has(k)) out.push(`${at}: unsupported keyword ${k}`);
  if (typeof schema.$ref === "string") {
    try { resolveRef(root, schema.$ref); } catch (e) { out.push(`${at}: ${(e as Error).message}`); }
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    for (const t of types) if (!TYPES.has(t as string)) out.push(`${at}: unknown type ${String(t)}`);
  }
  if (schema.required !== undefined && !(Array.isArray(schema.required) && schema.required.every((r) => typeof r === "string"))) {
    out.push(`${at}: required is a list of names`);
  }
  if (isObject(schema.properties) && Array.isArray(schema.required)) {
    for (const r of schema.required as string[]) if (!(r in schema.properties)) out.push(`${at}: required ${r} is not a property`);
  }
  if (schema.enum !== undefined && !(Array.isArray(schema.enum) && schema.enum.length)) out.push(`${at}: enum is a non-empty list`);
  if (typeof schema.pattern === "string") {
    try { new RegExp(schema.pattern, "u"); } catch { out.push(`${at}: bad pattern`); }
  }
  const sub = (s: unknown, path: string) => out.push(...schemaProblems(s, root, path));
  if (isObject(schema.properties)) for (const [k, s] of Object.entries(schema.properties)) sub(s, `${at}/properties/${k}`);
  for (const k of ["additionalProperties", "items", "propertyNames"]) if (schema[k] !== undefined) sub(schema[k], `${at}/${k}`);
  for (const k of ["prefixItems", "oneOf", "anyOf", "allOf"]) {
    if (schema[k] === undefined) continue;
    if (!Array.isArray(schema[k])) out.push(`${at}: ${k} is a list`);
    else (schema[k] as unknown[]).forEach((s, i) => sub(s, `${at}/${k}/${i}`));
  }
  return out;
}

function typeMatches(v: unknown, t: string): boolean {
  switch (t) {
    case "null": return v === null;
    case "integer": return Number.isInteger(v);
    case "number": return typeof v === "number" && Number.isFinite(v);
    case "object": return isObject(v);
    case "array": return Array.isArray(v);
    default: return typeof v === t;
  }
}

const patterns = new Map<string, RegExp>();
const regex = (p: string) => patterns.get(p) ?? patterns.set(p, new RegExp(p, "u")).get(p)!;

/** Where `value` breaks `schema` (empty when it is valid). References resolve against `root`. */
export function validate(value: unknown, schema: Schema, root: unknown, { strict = true } = {}): string[] {
  const out: string[] = [];
  const walk = (v: unknown, s: Schema, at: string): void => {
    if (s === true) return;
    if (s === false) { out.push(`${at}: not allowed`); return; }
    for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`${at}: unsupported schema keyword ${k}`);
    if (typeof s.$ref === "string") walk(v, resolveRef(root, s.$ref) as Schema, at);
    if (s.type !== undefined) {
      const types = (Array.isArray(s.type) ? s.type : [s.type]) as string[];
      if (!types.some((t) => typeMatches(v, t))) { out.push(`${at}: expected ${types.join("|")}, got ${v === null ? "null" : typeof v}`); return; }
    }
    if ("const" in s && !isDeepStrictEqual(v, s.const)) out.push(`${at}: expected ${JSON.stringify(s.const)}`);
    if (Array.isArray(s.enum) && !s.enum.some((e) => isDeepStrictEqual(e, v))) out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(s.enum)}`);
    if (typeof v === "string") {
      if (typeof s.minLength === "number" && [...v].length < s.minLength) out.push(`${at}: shorter than ${s.minLength}`);
      if (typeof s.maxLength === "number" && [...v].length > s.maxLength) out.push(`${at}: longer than ${s.maxLength}`);
      if (typeof s.pattern === "string" && !regex(s.pattern).test(v)) out.push(`${at}: ${JSON.stringify(v)} does not match ${s.pattern}`);
    }
    if (typeof v === "number") {
      if (typeof s.minimum === "number" && v < s.minimum) out.push(`${at}: below ${s.minimum}`);
      if (typeof s.maximum === "number" && v > s.maximum) out.push(`${at}: above ${s.maximum}`);
    }
    if (Array.isArray(v)) {
      if (typeof s.minItems === "number" && v.length < s.minItems) out.push(`${at}: fewer than ${s.minItems} items`);
      if (typeof s.maxItems === "number" && v.length > s.maxItems) out.push(`${at}: more than ${s.maxItems} items`);
      const prefix = (s.prefixItems ?? []) as Schema[];
      prefix.forEach((p, i) => { if (i < v.length) walk(v[i], p, `${at}/${i}`); });
      if (s.items !== undefined) for (let i = prefix.length; i < v.length; i++) walk(v[i], s.items as Schema, `${at}/${i}`);
    }
    if (isObject(v)) {
      const props = (isObject(s.properties) ? s.properties : {}) as Record<string, Schema>;
      for (const r of (s.required ?? []) as string[]) if (!(r in v)) out.push(`${at}: missing ${r}`);
      for (const [k, val] of Object.entries(v)) {
        if (s.propertyNames !== undefined) walk(k, s.propertyNames as Schema, `${at}/${k} (name)`);
        if (k in props) walk(val, props[k], `${at}/${k}`);
        else if (s.additionalProperties !== undefined) walk(val, s.additionalProperties as Schema, `${at}/${k}`);
        else if (strict && isObject(s.properties)) out.push(`${at}: undocumented property ${k}`);
      }
    }
    for (const a of (s.allOf ?? []) as Schema[]) walk(v, a, at);
    const passes = (list: Schema[]) => list.filter((a) => validate(v, a, root, { strict }).length === 0).length;
    if (Array.isArray(s.anyOf) && passes(s.anyOf as Schema[]) === 0) out.push(`${at}: matches none of anyOf`);
    if (Array.isArray(s.oneOf) && passes(s.oneOf as Schema[]) !== 1) out.push(`${at}: must match exactly one of oneOf`);
  };
  walk(value, schema, "$");
  return out;
}
