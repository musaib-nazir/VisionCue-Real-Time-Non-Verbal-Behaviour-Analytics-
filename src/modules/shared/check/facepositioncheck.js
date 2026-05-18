export const checkFacePosition = ( faceCenterX,
  faceCenterY,
  facePostRef)=>{


  
     
      let facePositionStatus = "";
      let facePositionSuggestion = "";
      let showFacePositionPopup = false;

      if (  faceCenterX < 0.4) {
        facePositionStatus = "Face Left Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";
        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterX > 0.6) {
        facePositionStatus = "Face Right Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";
        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterY < 0.4) {
        facePositionStatus = "Face Top Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";

        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterY > 0.6) {
        facePositionStatus = "Face Bottom Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";

        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else {
        facePositionStatus = "Face Centered ✅";
        facePositionSuggestion = "Face position is good";
        showFacePositionPopup = false;
        facePostRef.current = null;
      }





  return {
    facePositionStatus,
    facePositionSuggestion,
    showFacePositionPopup,
  };






}
