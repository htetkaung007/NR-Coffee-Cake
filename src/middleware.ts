import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * /menu ကို cookie session ရှိသူ၊ မရှိသူ နှစ်ဦးစလုံး ရောက်ခွင့်ရှိရမယ်
 * (view-only vs order UI ကို page ကိုယ်တိုင်က ဆုံးဖြတ်တယ် —
 * menu/page.tsx ရဲ့ comment ကြည့်ပါ), ဒါကြောင့် backoffice auth
 * guard တစ်ခုတည်းပဲ ဒီ middleware မှာ ကျန်တော့တယ်.
 */
export default async function middleware(request: NextRequest) {
  return guardBackoffice(request);
}

async function guardBackoffice(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/auth/signIn", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backoffice/:path*"],
};
