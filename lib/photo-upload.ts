// Keep the full fish in frame; optimize a local copy before uploading.
export async function preparePhoto(file: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size
  )
    throw Error("請選擇 JPG、PNG 或 WebP 魚相。");
  if (file.size > 20 * 1024 * 1024)
    throw Error("魚相最大 20 MB，請先縮小圖片。");
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    throw Error("未能讀取魚相，請選擇另一張圖片。");
  }
  try {
    if (image.width * image.height > 60_000_000)
      throw Error("圖片尺寸過大，請先縮小圖片。");
    const target = 2 * 1024 * 1024;
    if (file.size <= target && Math.max(image.width, image.height) <= 2560)
      return file;
    let edge = 2560;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, edge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw Error("未能壓縮魚相，請重新選取圖片。");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.76, 0.64]) {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(Error("未能壓縮魚相。"))),
            "image/jpeg",
            quality,
          ),
        );
        if (blob.size <= target)
          return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
            type: "image/jpeg",
          });
      }
      edge = Math.floor(edge * 0.75);
    }
    throw Error("未能將魚相壓縮至可上傳大小，請選擇另一張圖片。");
  } finally {
    image.close();
  }
}
