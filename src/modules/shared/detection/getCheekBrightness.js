

import { getBrightness } from "./getBrightness";
export const getCheekBrightness = (
  pctx,
  landmarks,
  canvasWidth,
  canvasHeight,
  cheekPoints,
) => {




      const [leftCheek, rightCheek] = cheekPoints(landmarks);
      const leftX = Math.floor(leftCheek.x * canvasWidth);
      const leftY = Math.floor(leftCheek.y * canvasHeight);
      const rightX = Math.floor(rightCheek.x * canvasWidth);
      const rightY = Math.floor(rightCheek.y * canvasHeight);
      const boxSize = 35;
      const halfBox = Math.floor(boxSize / 2);
      const leftBoxX = leftX - halfBox;
      const leftBoxY = leftY - halfBox;
      const rightBoxX = rightX - halfBox;
      const rightBoxY = rightY - halfBox;
      console.log("Left box:", leftBoxX, leftBoxY);
      console.log("Right box:", rightBoxX, rightBoxY);



      const leftCheekRegion = pctx.getImageData(
        leftBoxX,
        leftBoxY,
        boxSize,
        boxSize,
      );
      const rightCheekRegion = pctx.getImageData(
        rightBoxX,
        rightBoxY,
        boxSize,
        boxSize,
      );
      console.log("Left cheek region:", leftCheekRegion);
      console.log("Right cheek region:", rightCheekRegion);
      const leftBrightness = getBrightness(leftCheekRegion);
      const rightBrightness = getBrightness(rightCheekRegion);
      console.log("Left Cheek Brightness:", leftBrightness);
      console.log("Right Cheek Brightness:", rightBrightness);

      const lightingDifference = Math.abs(leftBrightness - rightBrightness);

      console.log("Lighting Difference:", lightingDifference);

 return{

     leftBrightness,
    rightBrightness,
    lightingDifference,
 }

};
