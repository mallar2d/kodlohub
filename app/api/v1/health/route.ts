import { corsHeaders } from "@/lib/api/cors";

export async function GET(request: Request) {
  return Response.json(
    {
      status: "ok",
      service: "KodloHUB API",
      version: "v1",
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
