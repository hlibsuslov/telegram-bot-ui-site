// The OpenAPI document is a well-formed 3.1 document, documents every API route of the app, and its
// examples and schemas agree with each other.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ERRORS, RATE_LIMITS } from "@/lib/emoji-api-contract";
import { openApiDocument } from "@/lib/emoji-openapi";
import { resolveRef, schemaProblems, validate } from "./schema";

const doc = openApiDocument("https://example.test") as unknown as Doc;

type Obj = Record<string, unknown>;
interface Operation { operationId: string; tags?: string[]; parameters?: Obj[]; responses: Record<string, Obj>; [k: string]: unknown }
interface Doc { openapi: string; info: Obj; servers: Obj[]; tags: Obj[]; paths: Record<string, Record<string, Operation>>; components: { schemas: Obj } }

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const PATH_ITEM_KEYS = new Set([...METHODS, "$ref", "summary", "description", "servers", "parameters"]);
const OPERATION_KEYS = new Set(["tags", "summary", "description", "externalDocs", "operationId", "parameters", "requestBody", "responses",
  "callbacks", "deprecated", "security", "servers"]);
const RESPONSE_KEYS = new Set(["description", "headers", "content", "links"]);
const MEDIA_KEYS = new Set(["schema", "example", "examples", "encoding"]);
const PARAMETER_KEYS = new Set(["name", "in", "description", "required", "deprecated", "allowEmptyValue", "style", "explode", "allowReserved",
  "schema", "example", "examples", "content"]);
const known = (keys: Set<string>, o: Obj) => Object.keys(o).filter((k) => !keys.has(k) && !k.startsWith("x-"));

function operations(): [string, string, Operation][] {
  return Object.entries(doc.paths).flatMap(([path, item]) => METHODS.filter((m) => item[m]).map((m) => [path, m, item[m]] as [string, string, Operation]));
}

function refs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => refs(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.push(v);
      else refs(v, out);
    }
  }
  return out;
}

test("top level: OpenAPI 3.1 with info, servers and tags", () => {
  assert.match(doc.openapi, /^3\.1\.\d+$/);
  assert.equal(typeof doc.info.title, "string");
  assert.equal(typeof doc.info.version, "string");
  assert.ok(doc.servers.length && doc.servers.every((s) => typeof s.url === "string"));
  const declared = new Set(doc.tags.map((t) => t.name));
  for (const [, , op] of operations()) for (const t of op.tags ?? []) assert.ok(declared.has(t), `tag ${t} is not declared`);
});

test("paths and operations use only OpenAPI 3.1 fields", () => {
  const ids = new Set<string>();
  for (const [path, item] of Object.entries(doc.paths)) {
    assert.match(path, /^\//);
    assert.deepEqual(known(PATH_ITEM_KEYS, item as Obj), [], `${path}: unknown path item fields`);
  }
  for (const [path, method, op] of operations()) {
    const where = `${method.toUpperCase()} ${path}`;
    assert.deepEqual(known(OPERATION_KEYS, op), [], `${where}: unknown operation fields`);
    assert.ok(op.operationId && !ids.has(op.operationId), `${where}: operationId missing or repeated`);
    ids.add(op.operationId);
    assert.ok(Object.keys(op.responses).length, `${where}: no responses`);
    for (const [status, res] of Object.entries(op.responses)) {
      assert.match(status, /^([1-5](\d\d|XX)|default)$/, `${where}: bad status ${status}`);
      assert.deepEqual(known(RESPONSE_KEYS, res), [], `${where} ${status}: unknown response fields`);
      assert.equal(typeof res.description, "string", `${where} ${status}: a response needs a description`);
      for (const [type, media] of Object.entries((res.content ?? {}) as Record<string, Obj>)) {
        assert.match(type, /^[\w.+-]+\/[\w.+-]+$/, `${where} ${status}: bad media type ${type}`);
        assert.deepEqual(known(MEDIA_KEYS, media), [], `${where} ${status} ${type}: unknown media fields`);
      }
      for (const [name, header] of Object.entries((res.headers ?? {}) as Record<string, Obj>)) {
        assert.ok(header.schema || header.content, `${where} ${status}: header ${name} needs a schema`);
      }
    }
    const params = op.parameters ?? [];
    const seen = new Set<string>();
    for (const p of params) {
      assert.deepEqual(known(PARAMETER_KEYS, p), [], `${where}: unknown parameter fields`);
      assert.ok(typeof p.name === "string" && ["query", "header", "path", "cookie"].includes(p.in as string), `${where}: bad parameter`);
      assert.ok(!!p.schema !== !!p.content, `${where}: parameter ${p.name} needs schema or content`);
      assert.ok(!seen.has(`${p.in}:${p.name}`), `${where}: parameter ${p.name} repeated`);
      seen.add(`${p.in}:${p.name}`);
      if (p.in === "path") assert.equal(p.required, true, `${where}: path parameter ${p.name} must be required`);
    }
    const inTemplate = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(params.filter((p) => p.in === "path").map((p) => p.name).sort(), inTemplate, `${where}: path parameters`);
  }
});

test("every reference resolves and every schema is well-formed", () => {
  for (const r of refs(doc)) assert.doesNotThrow(() => resolveRef(doc, r), r);
  for (const [name, schema] of Object.entries(doc.components.schemas)) assert.deepEqual(schemaProblems(schema, doc, `#/components/schemas/${name}`), []);
  for (const [path, method, op] of operations()) {
    for (const [status, res] of Object.entries(op.responses)) {
      for (const [type, media] of Object.entries((res.content ?? {}) as Record<string, Obj>)) {
        if (media.schema) assert.deepEqual(schemaProblems(media.schema, doc, `${method} ${path} ${status} ${type}`), []);
      }
    }
  }
});

test("every example matches its schema", () => {
  let checked = 0;
  for (const [path, method, op] of operations()) {
    for (const [status, res] of Object.entries(op.responses)) {
      for (const [type, media] of Object.entries((res.content ?? {}) as Record<string, Obj>)) {
        if (!("example" in media)) continue;
        assert.deepEqual(validate(media.example, media.schema as Obj, doc), [], `${method} ${path} ${status} ${type}`);
        checked++;
      }
    }
  }
  for (const [name, schema] of Object.entries(doc.components.schemas) as [string, Obj][]) {
    for (const example of (schema.examples ?? []) as unknown[]) {
      assert.deepEqual(validate(example, schema, doc), [], name);
      checked++;
    }
  }
  // one 200 example for every JSON endpoint, plus the export's line
  assert.ok(checked >= 5, `only ${checked} examples`);
});

test("errors: every documented code has its status, and each status lists its codes", () => {
  for (const [path, method, op] of operations()) {
    for (const [status, res] of Object.entries(op.responses)) {
      if (status.startsWith("2")) continue;
      const schema = (res.content as Record<string, Obj>)["application/json"].schema as Obj;
      const codes = (((schema.properties as Obj).error as Obj).properties as Record<string, Obj>).code.enum as (keyof typeof ERRORS)[];
      for (const c of codes) assert.equal(String(ERRORS[c].status), status, `${method} ${path}: ${c} is ${ERRORS[c].status}, documented as ${status}`);
    }
  }
});

test("rate limits: every limited operation documents its limit and a 429", () => {
  const limited = operations().filter(([, , op]) => op["x-rate-limit"]);
  assert.deepEqual(new Set(limited.map(([, , op]) => (op["x-rate-limit"] as Obj).requests)), new Set(Object.values(RATE_LIMITS)));
  for (const [path, , op] of limited) assert.ok(op.responses["429"], `${path}: limited but no 429`);
});

test("every API route of the app is documented", () => {
  const app = fileURLToPath(new URL("../../src/app/", import.meta.url));
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (e.name === "route.ts") routes.push(`/${relative(app, dir).split(sep).join("/")}`.replace(/\[(\w+)\]/g, "{$1}"));
    }
  };
  walk(join(app, "api"));
  routes.push("/emoji-library.ndjson.gz");
  assert.deepEqual(routes.sort(), Object.keys(doc.paths).sort());
});
