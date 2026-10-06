import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const preview = request.nextUrl.pathname === "/vista-previa" || request.nextUrl.pathname.startsWith("/vista-previa/");
  if (preview) {
    if (process.env.NODE_ENV === "development" && process.env.HERMES_UI_PREVIEW === "1") return NextResponse.next();
    return new NextResponse(null, { status: 404 });
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
