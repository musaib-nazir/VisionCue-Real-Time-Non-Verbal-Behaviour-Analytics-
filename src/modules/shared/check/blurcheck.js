export const blurCheck = (blurScore, blurRef) => {
  let blurStatus = "";
  let blurSuggestion = "";
  let showBlurPopup = false;
  let blurSeverity = "excellent";
  let blurQualityScore = 100;

  if (blurScore < 50) {
    blurStatus = "Image blurry";
    blurSuggestion = "Clean the camera lens, hold steady, or improve focus.";
    blurSeverity = "poor";
    blurQualityScore = 55;

    if (!blurRef.current) {
      blurRef.current = performance.now();
    }

    const blurDuration = performance.now() - blurRef.current;
    if (blurDuration > 3000) {
      showBlurPopup = true;
    }
  } else if (blurScore < 80) {
    blurStatus = "Slight blur detected";
    blurSuggestion = "Hold steady or improve focus for better accuracy.";
    blurSeverity = "acceptable";
    blurQualityScore = 85;
    blurRef.current = null;
    showBlurPopup = false;
  } else {
    blurStatus = "Image sharp";
    blurSuggestion = "Camera focus is clear.";
    blurSeverity = "excellent";
    blurQualityScore = 100;
    blurRef.current = null;
    showBlurPopup = false;
  }

  return {
    blurStatus,
    blurSuggestion,
    showBlurPopup,
    blurSeverity,
    blurQualityScore,
  };
};
