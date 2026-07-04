import { getOpenApiSpec } from "@/lib/api/openapi-spec";
import { corsHeaders } from "@/lib/api/cors";

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  return Response.json(getOpenApiSpec(base), {
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
