export const blurCheck = (blurScore, blurRef) => {
  let blurStatus = "";
  let blurSuggestion = "";
  let showBlurPopup = false;

  if (blurScore < 80) {
    blurStatus = "Image blurry";
    blurSuggestion = "Clean the camera lens, hold steady, or improve focus.";

    if (!blurRef.current) {
      blurRef.current = performance.now();
    }

    const blurDuration = performance.now() - blurRef.current;
    if (blurDuration > 3000) {
      showBlurPopup = true;
    }
  } else {
    blurStatus = "Image sharp";
    blurSuggestion = "Camera focus is clear.";
    blurRef.current = null;
    showBlurPopup = false;
  }

  return {
    blurStatus,
    blurSuggestion,
    showBlurPopup,
  };
};
