export function pngDimensions(bytes: Uint8Array, max = 1024) {
  if (
    bytes.length < 24 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    throw Error("請提供有效 PNG 圖片");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    width = view.getUint32(16),
    height = view.getUint32(20);
  if (!width || !height || width > max || height > max)
    throw Error("PNG 圖片尺寸超出上限");
  return { width, height };
}
export function removeMatte(input: Uint8Array, width: number, height: number) {
  const data = new Uint8Array(input),
    seen = new Uint8Array(width * height),
    queue: number[] = [];
  const matte = (i: number) => {
    const r = data[i * 4],
      g = data[i * 4 + 1],
      b = data[i * 4 + 2];
    return (
      data[i * 4 + 3] === 0 ||
      (r > 180 && b > 180 && g < 100 && Math.abs(r - b) < 90)
    );
  };
  const add = (i: number) => {
    if (i >= 0 && i < width * height && !seen[i] && matte(i)) {
      seen[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    data[i * 4 + 3] = 0;
    if (i % width > 0) add(i - 1);
    if (i % width < width - 1) add(i + 1);
    if (i >= width) add(i - width);
    if (i < width * (height - 1)) add(i + width);
  }
  return data;
}

/** Mirror without resampling, preserving every RGBA pixel and transparent edge. */
export function orientFishPixels(
  input: Uint8Array,
  width: number,
  height: number,
  facing: "left" | "right",
  inverted = false,
) {
  const output = new Uint8Array(input.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sourceX = facing === "right" ? width - 1 - x : x;
      const sourceY = inverted ? height - 1 - y : y;
      const source = (sourceY * width + sourceX) * 4;
      output.set(input.subarray(source, source + 4), (y * width + x) * 4);
    }
  return output;
}
