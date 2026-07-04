import { API_GROUPS, type DocEndpoint, type DocField } from "@/lib/api/docs-data";

function schemaType(type: string): Record<string, unknown> {
  if (type.endsWith("[]")) {
    return { type: "array", items: schemaType(type.slice(0, -2)) };
  }
  switch (type) {
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "object":
      return { type: "object" };
    default:
      return { type: "string" };
  }
}

function pathParams(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z_]+)/g)].map((m) => m[1]);
}

function requestBody(fields: DocField[]) {
  const required = fields.filter((f) => f.required).map((f) => f.name);
  return {
    required: required.length > 0,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: Object.fromEntries(
            fields.map((f) => [f.name, { ...schemaType(f.type), description: f.desc }])
          ),
          ...(required.length ? { required } : {}),
        },
      },
    },
  };
}

function operation(ep: DocEndpoint, groupTitle: string) {
  const params = [
    ...pathParams(ep.path).map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    })),
    ...(ep.query ?? []).map((q) => ({
      name: q.name,
      in: "query",
      required: q.required === true,
      description: q.desc,
      schema: schemaType(q.type),
    })),
  ];

  const descriptionParts = [
    ep.scope ? `Scope: \`${ep.scope}\`.` : "Не потребує API ключа.",
    ...(ep.serviceUser ? ["Ключ повинен мати service user."] : []),
    ...(ep.notes ?? []),
  ];

  const responses: Record<string, unknown> = {
    "200": { description: "OK" },
    ...(ep.method === "POST" ? { "201": { description: "Created" } } : {}),
    ...(ep.scope
      ? {
          "401": { description: "Missing or invalid API key" },
          "403": { description: "Insufficient scope" },
          "429": { description: "Rate limit exceeded" },
        }
      : {}),
  };

  return {
    tags: [groupTitle],
    summary: ep.title,
    description: descriptionParts.join(" "),
    ...(params.length ? { parameters: params } : {}),
    ...(ep.body?.length ? { requestBody: requestBody(ep.body) } : {}),
    ...(ep.scope === null ? { security: [] } : {}),
    responses,
  };
}

export function getOpenApiSpec(baseUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const group of API_GROUPS) {
    for (const ep of group.endpoints) {
      const oaPath = ep.path === "/" ? "/" : ep.path.replace(/:([A-Za-z_]+)/g, "{$1}");
      paths[oaPath] = paths[oaPath] ?? {};
      paths[oaPath][ep.method.toLowerCase()] = operation(ep, group.title);
    }
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "KodloHUB API",
      version: "1.1.0",
      description:
        "External API for bots and third-party integrations. Docs: " + `${baseUrl}/docs`,
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    tags: API_GROUPS.map((g) => ({ name: g.title, ...(g.desc ? { description: g.desc } : {}) })),
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API Key" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
    paths,
  };
}
