export const checkBrightness = (
  brightness,
  badLightiningRef
) => {

  // --------------------------------
  // OUTPUT
  // --------------------------------
  let lightingStatus = "";

  let lightingSuggestion = "";

  let showLightingPopup = false;

  // --------------------------------
  // QUALITY SCORE
  // --------------------------------
  let brightnessQualityScore = 100;

  // --------------------------------
  // SEVERITY
  // --------------------------------
  let brightnessSeverity = "excellent";

  // --------------------------------
  // TOO DARK
  // --------------------------------
  if (brightness < 50) {

    brightnessSeverity = "poor";

    brightnessQualityScore -= 45;

    lightingStatus = "Too Dark ❌";

    lightingSuggestion =
      "Move closer to a light source";

    if (!badLightiningRef.current) {
      badLightiningRef.current =
        performance.now();
    }

    const badDuration =
      performance.now() -
      badLightiningRef.current;

    if (badDuration > 3000) {

      showLightingPopup = true;
    }
  }

  // --------------------------------
  // SLIGHTLY DARK
  // --------------------------------
  else if (brightness < 80) {

    brightnessSeverity = "acceptable";

    brightnessQualityScore -= 10;

    lightingStatus =
      "Low Brightness ⚠";

    lightingSuggestion =
      "Face is slightly dark.";

    badLightiningRef.current = null;
  }

  // --------------------------------
  // IDEAL
  // --------------------------------
  else if (brightness <= 170) {

    brightnessSeverity = "excellent";

    lightingStatus =
      "Lighting Good ✅";

    lightingSuggestion =
      "Lighting is suitable for video capture";

    badLightiningRef.current = null;
  }

  // --------------------------------
  // SLIGHTLY BRIGHT
  // --------------------------------
  else if (brightness <= 210) {

    brightnessSeverity = "acceptable";

    brightnessQualityScore -= 10;

    lightingStatus =
      "Bright Lighting ⚠";

    lightingSuggestion =
      "Lighting is slightly strong.";

    badLightiningRef.current = null;
  }

  // --------------------------------
  // OVEREXPOSED
  // --------------------------------
  else {

    brightnessSeverity = "poor";

    brightnessQualityScore -= 45;

    lightingStatus =
      "Too Bright ❌";

    lightingSuggestion =
      "Reduce strong direct lighting.";

    if (!badLightiningRef.current) {

      badLightiningRef.current =
        performance.now();
    }

    const badDuration =
      performance.now() -
      badLightiningRef.current;

    if (badDuration > 3000) {

      showLightingPopup = true;
    }
  }

  // --------------------------------
  // RETURN
  // --------------------------------
  return {

    lightingStatus,

    lightingSuggestion,

    showLightingPopup,

    brightnessSeverity,

    brightnessQualityScore,
  };
};