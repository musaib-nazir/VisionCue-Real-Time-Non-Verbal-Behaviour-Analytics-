export const getFaceArea=(minX, maxX, minY, maxY)=>{

    const FWIdth = maxX - minX;
      const FHeight = maxY - minY;
      const FaceArea = FWIdth * FHeight;




 return{FaceArea, FWIdth, FHeight}

}