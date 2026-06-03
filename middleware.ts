import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // After getUser(), any token refresh has written new cookies to request.cookies
  // via setAll. The supabaseResponse may be stale if setAll was called async.
  // Re-create the response to ensure all refreshed cookies are included.
  supabaseResponse = NextResponse.next({ request });
  request.cookies.getAll().forEach(({ name, value }) => {
    supabaseResponse.cookies.set(name, value, {
      secure: process.env.NODE_ENV === "production",
    });
  });

  const path = request.nextUrl.pathname;

  // Protect /admin routes
  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "shemetovany";
    if (role !== "owner" && role !== "podrofikovany") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect /wiki edit routes (admins only)
  if (path.match(/^\/wiki\/[^/]+\/[^/]+\/edit/)) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "shemetovany";
    if (role !== "owner" && role !== "podrofikovany") {
      return NextResponse.redirect(new URL("/wiki", request.url));
    }
  }

  // Protect /upload route
  if (path.startsWith("/upload")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|flac|aac|ico|css|js|map)$).*)",
  ],
};
