// modules/shared/check/unevenLightingCheck.js

export const unevenLightingCheck = (
  {
    leftBrightness,
    rightBrightness,
    lightingDifferencePercent,
  },
  unevenLightingRef
) => {

  // --------------------------------
  // UI OUTPUT
  // --------------------------------
  let unevenLightingStatus = "";

  let unevenLightingSuggestion = "";

  let showUnevenLightingPopup = false;

  // --------------------------------
  // LIGHTING QUALITY SCORE
  // --------------------------------
  let lightingQualityScore = 100;

  // --------------------------------
  // SEVERITY
  // --------------------------------
  let severity = "excellent";

  // --------------------------------
  // INIT MEMORY
  // --------------------------------
  if (!unevenLightingRef.current) {

    unevenLightingRef.current = {
      startTime: null,
    };
  }

  const memory = unevenLightingRef.current;

  // --------------------------------
  // BALANCED LIGHTING
  // --------------------------------
  if (lightingDifferencePercent <= 30) {

    memory.startTime = null;

  }

  // --------------------------------
  // UNEVEN BUT USABLE
  // --------------------------------
  else if (
    lightingDifferencePercent > 30 &&
    lightingDifferencePercent <= 65
  ) {

    memory.startTime = null;

    lightingQualityScore -= 10;

  }

  // --------------------------------
  // CHALLENGING LIGHTING
  // --------------------------------
  else {

    lightingQualityScore -= 20;

  }

  // --------------------------------
  // SCORE → SEVERITY
  // --------------------------------
  if (lightingQualityScore >= 90) {

    severity = "excellent";
  }

  else if (lightingQualityScore >= 75) {

    severity = "good";
  }

  else if (lightingQualityScore >= 55) {

    severity = "acceptable";
  }

  else if (lightingQualityScore >= 35) {

    severity = "challenging";
  }

  else {

    severity = "poor";
  }

  // --------------------------------
  // HUMAN STATUS GENERATION
  // --------------------------------
  switch (severity) {

    case "excellent":

      unevenLightingStatus =
        "Excellent Lighting Balance ✅";

      unevenLightingSuggestion =
        "Lighting is evenly distributed.";

      break;

    case "good":

      unevenLightingStatus =
        "Good Lighting Balance ✅";

      unevenLightingSuggestion =
        "Lighting balance is suitable.";

      break;

    case "acceptable":

      unevenLightingStatus =
        "Slightly Uneven Lighting ⚠";

      unevenLightingSuggestion =
        "Minor lighting imbalance detected.";

      break;

    case "challenging":

      unevenLightingStatus =
        "Uneven Lighting ⚠";

      unevenLightingSuggestion =
        "Lighting imbalance may reduce accuracy.";

      break;

    case "poor":

      unevenLightingStatus =
        "Poor Lighting Balance ❌";

      unevenLightingSuggestion =
        "Strong lighting imbalance detected.";

      break;
  }

  // --------------------------------
  // PERSISTENT POPUP LOGIC
  // --------------------------------
  if (severity === "poor") {

    if (!memory.startTime) {

      memory.startTime =
        performance.now();
    }

    const duration =
      performance.now() -
      memory.startTime;

    // popup only if persistent
    if (duration > 4000) {

      showUnevenLightingPopup = true;
    }
  }

  else {

    memory.startTime = null;

    showUnevenLightingPopup = false;
  }

  // --------------------------------
  // RETURN
  // --------------------------------
  return {

    unevenLightingStatus,

    unevenLightingSuggestion,

    showUnevenLightingPopup,

    severity,

    lightingQualityScore,
  };
};
