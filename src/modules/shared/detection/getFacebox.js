export const getfacebox = (landmarks, canvasWidth, canvasHeight) => {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;

  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  console.log("Bounding Box:", minX, maxX, minY, maxY);

  const x1 = Math.floor(minX * canvasWidth);
  const x2 = Math.floor(maxX * canvasWidth);

  const y1 = Math.floor(minY * canvasHeight);
  const y2 = Math.floor(maxY * canvasHeight);
  console.log("pixel box: ", x1, x2, y1, y2);

  const faceWidth = x2 - x1;
  const faceHeight = y2 - y1;

  return {
    minX,
    maxX,
    minY,
    maxY,
    x1,
    x2,
    y1,
    y2,
    faceWidth,
    faceHeight,
  };
};
