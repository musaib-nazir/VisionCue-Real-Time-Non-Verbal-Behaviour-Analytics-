import { getBrightness } from "./getBrightness";

export const getFaceBrightness = (pctx, x, y, width, height) => {


   const faceRegion = pctx.getImageData(x, y, width, height);


return getBrightness(faceRegion);







};
