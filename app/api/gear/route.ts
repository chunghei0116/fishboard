import { privateUser, mutationOrigin } from "@/lib/firebase-auth";
import { commit, write } from "@/lib/firestore";
import { FishlogError, fail } from "@/lib/fishlog-env";
import { validateGear } from "@/lib/gear";
export async function PUT(request: Request) {
  try {
    mutationOrigin(request);
    const { uid } = await privateUser();
    const text = await request.text();
    if (text.length > 4096) throw new FishlogError("裝備資料過大。", 413);
    let profile;
    try {
      profile = validateGear(JSON.parse(text));
    } catch {
      throw new FishlogError("請填寫有效裝備名稱及 160 字以內的工具資料。");
    }
    await commit([write(uid, "profiles", "gear", { ...profile })]);
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
