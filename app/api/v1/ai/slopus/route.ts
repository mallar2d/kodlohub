import { withApiAuth } from "@/lib/api/auth";
import { corsHeaders } from "@/lib/api/cors";
import { POST as slopusHandler } from "@/app/api/tools/slopus/route";

export const POST = withApiAuth(
  async (request) => {
    const response = await slopusHandler(request);
    const headers = new Headers(response.headers);
    const cors = corsHeaders(request);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
  },
  { scopes: ["read"] }
);

export const OPTIONS = POST;
