export function getMultiFaceMetrics(landmarks){


const faceCount = landmarks?landmarks.length:0;
const multipleFaceCount = faceCount>1;
return{

faceCount,
multipleFaceCount


}




}