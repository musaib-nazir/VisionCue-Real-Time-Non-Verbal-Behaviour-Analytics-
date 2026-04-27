export const facedistancecheck = ( FaceArea,faceDistRef) => {

  let faceDistanceStatus = "";
      let faceDistanceSuggestion = "";
      let showFaceDistancePopup = false;

      if (FaceArea < 0.02) {
        console.log("Too Far from the camera");
        faceDistanceStatus = "Too Far ❌";
        faceDistanceSuggestion = "Move closer to the camera";
        if (!faceDistRef.current) {
          faceDistRef.current = performance.now();
        }
        const badDistance = performance.now() - faceDistRef.current;
        if (badDistance > 3000) {
          showFaceDistancePopup = true;
        }
      } else if (FaceArea > 0.55) {
        console.log("Too Close to the camera");
        faceDistanceStatus = "Too Close ⚠️";
        faceDistanceSuggestion = "Move slightly back";
        if (!faceDistRef.current) {
          faceDistRef.current = performance.now();
        }

        const badDistance = performance.now() - faceDistRef.current;
        if (badDistance > 3000) {
          showFaceDistancePopup = true;
        }
      } else {
        faceDistanceStatus = "Good Distance ✅";
        faceDistanceSuggestion = "Face distance is ideal";
        showFaceDistancePopup = false;
        faceDistRef.current = null;
      }

  return{
faceDistanceStatus,
faceDistanceSuggestion,
showFaceDistancePopup



  }




    }