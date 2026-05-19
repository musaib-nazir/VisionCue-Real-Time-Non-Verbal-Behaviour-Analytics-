export const checkFacePosition = (faceCenterX, faceCenterY, facePostRef) => {
  let facePositionStatus = "";
  let facePositionSuggestion = "";
  let showFacePositionPopup = false;

  function markBadPosition(status) {
    facePositionStatus = status;
    facePositionSuggestion = "Please center your face in the frame";

    if (!facePostRef.current) {
      facePostRef.current = performance.now();
      return;
    }

    const badPosition = performance.now() - facePostRef.current;
    if (badPosition > 3000) {
      showFacePositionPopup = true;
    }
  }

  if (faceCenterX < 0.4) {
    markBadPosition("Face Left Aligned - Warning");
  } else if (faceCenterX > 0.6) {
    markBadPosition("Face Right Aligned - Warning");
  } else if (faceCenterY < 0.4) {
    markBadPosition("Face Top Aligned - Warning");
  } else if (faceCenterY > 0.6) {
    markBadPosition("Face Bottom Aligned - Warning");
  } else {
    facePositionStatus = "Face Centered - OK";
    facePositionSuggestion = "Face position is good";
    showFacePositionPopup = false;
    facePostRef.current = null;
  }

  return {
    facePositionStatus,
    facePositionSuggestion,
    showFacePositionPopup,
  };
};
