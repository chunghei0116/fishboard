import { verifyToken, mutationOrigin } from "@/lib/firebase-auth";
import { fail, FishlogError } from "@/lib/fishlog-env";
export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 10000)
      throw new FishlogError("登入資料無效。", 413);
    const { idToken } = (await request.json()) as { idToken?: unknown };
    if (typeof idToken !== "string" || idToken.length > 8000)
      throw new FishlogError("登入資料無效。");
    const user = await verifyToken(idToken);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return Response.json(
      { user: { uid: user.uid, email: user.email } },
      {
        headers: {
          "Set-Cookie": `fishboard_session=${idToken}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${Math.max(0, Math.floor(user.expiresAt - Date.now() / 1000))}`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    mutationOrigin(request);
    return Response.json(
      { signedOut: true },
      {
        headers: {
          "Set-Cookie":
            "fishboard_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return fail(e);
  }
}
