    export function getMultiFaceMetrics(landmarks){


    const faceCount = landmarks?landmarks.length:0;
    const  multipleFacesDetected = faceCount>1;
    return{

    faceCount,
    multipleFacesDetected


    }




    }