export const facedistancecheck = (FaceArea, faceDistRef) => {

  let faceDistanceStatus = "";
      let faceDistanceSuggestion = "";
      let showFaceDistancePopup = false;
let faceDistanceType = null;
      if (FaceArea < 0.02) {
        faceDistanceStatus = "Too Far ❌";
        faceDistanceType = "too_far";
        faceDistanceSuggestion = "Move closer to the camera";
        if (!faceDistRef.current) {
          faceDistRef.current = performance.now();
        }
        const badDistance = performance.now() - faceDistRef.current;
        if (badDistance > 3000) {
          showFaceDistancePopup = true;
        }
      } else if (FaceArea > 0.55) {
        faceDistanceStatus = "Too Close ⚠️";
        faceDistanceType = "too_close";
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
        faceDistanceType = null;
      }

  return{
faceDistanceStatus,
faceDistanceSuggestion,
showFaceDistancePopup,
faceDistanceType



  }




    }
