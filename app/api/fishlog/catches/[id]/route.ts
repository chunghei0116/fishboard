import { privateUser, mutationOrigin } from "@/lib/firebase-auth";
import { getDocument, documentPath, commit, write } from "@/lib/firestore";
import { removeImage } from "@/lib/cloudinary";
import { settings, FishlogError, fail } from "@/lib/fishlog-env";
import { safeId } from "@/lib/fishlog-security";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationOrigin(request);
    const { uid } = await privateUser();
    const { id } = await params;
    try {
      safeId(id);
    } catch {
      throw new FishlogError("紀錄編號無效。");
    }
    const record = await getDocument(uid, "catches", id);
    const previous = await getDocument(uid, "requests", id);
    if (!record && previous?.value.status !== "deleted")
      throw new FishlogError("紀錄不存在。", 404);
    const photo = record?.value.photo || previous?.value.deletePhoto;
    const deletion = {
      id,
      status: "deleted",
      deletedAt: previous?.value.deletedAt || new Date().toISOString(),
      deletePhoto: photo,
      cleanupPending: !!photo,
    };
    if (record) {
      await commit([
        {
          delete: documentPath(uid, "catches", id),
          currentDocument: { updateTime: record.updateTime },
        },
        write(uid, "requests", id, deletion),
      ]);
    }
    // Species and its shared sprite remain available to other catches.
    let cleanupPending = false;
    if (
      typeof photo === "string" &&
      (record || previous?.value.cleanupPending)
    ) {
      try {
        await removeImage(settings(), photo);
      } catch {
        cleanupPending = true;
      }
    }
    if (record || previous?.value.cleanupPending) {
      await commit([
        write(uid, "requests", id, { ...deletion, cleanupPending }),
      ]);
    }
    return Response.json(
      { deleted: true, cleanupPending },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
