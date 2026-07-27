export const checkBrightness = (brightness, badLightiningRef) => {
  let lightingStatus = "";
  let lightingSuggestion = "";
  let showLightingPopup = false;

  let brightnessQualityScore = 100;
  let brightnessSeverity = "excellent";

  // ----------------------------
  // TOO DARK
  // ----------------------------
  if (brightness < 45) {
    brightnessSeverity = "poor";
    brightnessQualityScore -= 45;

    lightingStatus = "Too Dark - Issue";
    lightingSuggestion =
      "Increase room lighting or move closer to a light source.";

    if (!badLightiningRef.current) {
      badLightiningRef.current = performance.now();
    }

    const badDuration =
      performance.now() - badLightiningRef.current;

    if (badDuration > 3000) {
      showLightingPopup = true;
    }

  // ----------------------------
  // SLIGHTLY DARK
  // ----------------------------
  } else if (brightness < 70) {
    brightnessSeverity = "acceptable";
    brightnessQualityScore -= 10;

    lightingStatus = "Low Brightness - Warning";
    lightingSuggestion =
      "Lighting is slightly dim.";

    badLightiningRef.current = null;

  // ----------------------------
  // GOOD LIGHTING
  // ----------------------------
  } else if (brightness <= 180) {
    brightnessSeverity = "excellent";

    lightingStatus = "Lighting Good - OK";
    lightingSuggestion =
      "Lighting is suitable for video capture.";

    badLightiningRef.current = null;

  // ----------------------------
  // SLIGHTLY BRIGHT
  // ----------------------------
  } else if (brightness <= 220) {
    brightnessSeverity = "acceptable";
    brightnessQualityScore -= 10;

    lightingStatus = "Bright Lighting - Warning";
    lightingSuggestion =
      "Lighting is slightly strong.";

    badLightiningRef.current = null;

  // ----------------------------
  // TOO BRIGHT
  // ----------------------------
  } else {
    brightnessSeverity = "poor";
    brightnessQualityScore -= 45;

    lightingStatus = "Too Bright - Issue";
    lightingSuggestion =
      "Reduce direct lighting or avoid strong light facing the camera.";

    if (!badLightiningRef.current) {
      badLightiningRef.current = performance.now();
    }

    const badDuration =
      performance.now() - badLightiningRef.current;

    if (badDuration > 3000) {
      showLightingPopup = true;
    }
  }

  return {
    lightingStatus,
    lightingSuggestion,
    showLightingPopup,
    brightnessSeverity,
    brightnessQualityScore,
  };
};
