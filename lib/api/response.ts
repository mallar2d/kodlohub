import { corsHeaders } from "@/lib/api/cors";

export function apiJson(
  request: Request,
  data: unknown,
  status = 200,
  extraHeaders?: HeadersInit
): Response {
  return Response.json(data, {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function apiError(
  request: Request,
  message: string,
  status: number,
  code?: string
): Response {
  return apiJson(request, { error: message, code }, status);
}
