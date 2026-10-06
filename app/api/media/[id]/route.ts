import { privateUser } from "@/lib/firebase-auth";
import { getDocument } from "@/lib/firestore";
import { readImage } from "@/lib/cloudinary";
import { settings, fail, FishlogError } from "@/lib/fishlog-env";
import { safeId } from "@/lib/fishlog-security";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { uid } = await privateUser(),
      { id } = await params;
    safeId(id);
    const pixel = new URL(request.url).searchParams.get("kind") === "pixel";
    const doc = await getDocument(uid, pixel ? "species" : "catches", id);
    const reference = doc?.value[pixel ? "pixelImage" : "photo"];
    if (typeof reference !== "string")
      throw new FishlogError("圖片不存在。", 404);
    const image = await readImage(settings(), reference);
    return new Response(image.body, {
      headers: {
        "Content-Type": image.headers.get("content-type") || "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
