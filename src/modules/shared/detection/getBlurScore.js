export const getBlurScore = (ctx, x, y, width, height) => {
  const safeX = Math.max(0, Math.floor(x));
  const safeY = Math.max(0, Math.floor(y));
  const safeWidth = Math.max(
    1,
    Math.min(Math.floor(width), ctx.canvas.width - safeX),
  );
  const safeHeight = Math.max(
    1,
    Math.min(Math.floor(height), ctx.canvas.height - safeY),
  );

  const image = ctx.getImageData(safeX, safeY, safeWidth, safeHeight);
  const { data } = image;
  const gray = new Float32Array(safeWidth * safeHeight);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    gray[pixel] = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  }

  let total = 0;
  let totalSquared = 0;
  let count = 0;

  for (let row = 1; row < safeHeight - 1; row += 1) {
    for (let col = 1; col < safeWidth - 1; col += 1) {
      const center = row * safeWidth + col;
      const laplacian =
        gray[center - safeWidth] +
        gray[center - 1] -
        gray[center] * 4 +
        gray[center + 1] +
        gray[center + safeWidth];

      total += laplacian;
      totalSquared += laplacian * laplacian;
      count += 1;
    }
  }

  if (!count) return 0;

  const mean = total / count;
  return totalSquared / count - mean * mean;
};
