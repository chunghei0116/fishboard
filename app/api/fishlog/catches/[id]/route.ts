import { privateUser, mutationOrigin } from "@/lib/firebase-auth";
import { getDocument, documentPath, commit, write } from "@/lib/firestore";
import { removeImage } from "@/lib/cloudinary";
import { settings, FishlogError, fail } from "@/lib/fishlog-env";
import { validateCatch } from "@/lib/fish-log";
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

export async function PATCH(
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
    if (!record) throw new FishlogError("紀錄不存在。", 404);
    const reader = request.body?.getReader();
    if (!reader) throw new FishlogError("請提供紀錄。");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new FishlogError("紀錄內容過長。", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw Error();
    } catch {
      throw new FishlogError("紀錄格式無效。");
    }
    if (
      body.expectedUpdatedAt !==
      (record.value.updatedAt || record.value.created || null)
    )
      throw new FishlogError("紀錄已有更新，請重新開啟詳情再編輯。", 409);
    let input;
    try {
      input = validateCatch(body);
    } catch (error) {
      throw new FishlogError((error as Error).message);
    }
    if (!input.location) throw new FishlogError("請填寫地點。");
    if (!(await getDocument(uid, "species", input.speciesId)))
      throw new FishlogError("魚種不存在。");
    const value = {
      ...record.value,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    await commit([
      {
        ...write(uid, "catches", id, value),
        currentDocument: { updateTime: record.updateTime },
      },
    ]);
    return Response.json(
      { id, updatedAt: value.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
