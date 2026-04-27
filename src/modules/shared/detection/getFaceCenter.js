export const getFaceCenter = (minX, maxX, minY, maxY) => {
  const faceCenterX = (minX + maxX) / 2;
  const faceCenterY = (minY + maxY) / 2;

  return {
    faceCenterX,
    faceCenterY,
  };
};