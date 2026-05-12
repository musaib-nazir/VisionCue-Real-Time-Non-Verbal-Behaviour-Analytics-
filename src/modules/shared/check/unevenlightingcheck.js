// modules/shared/check/unevenLightingCheck.js

export const unevenLightingCheck = (
  lightingDifferencePercent,
  unevenLightingRef
) => {

  let showUnevenLightingPopup = false;

  let unevenLightingStatus = "";
  let unevenLightingSuggestion = "";

  // -------------------------------
  // INIT MEMORY
  // -------------------------------
  if (!unevenLightingRef.current) {
    unevenLightingRef.current = {
      startTime: null,
    };
  }

  const memory = unevenLightingRef.current;

  // -------------------------------
  // BALANCED LIGHTING
  // -------------------------------
  if (lightingDifferencePercent <= 20) {

    memory.startTime = null;

    unevenLightingStatus =
      "Lighting Balanced ✅";

    unevenLightingSuggestion =
      "Lighting is well balanced.";

    console.log("✅ Balanced Lighting");
  }

  // -------------------------------
  // SLIGHTLY UNEVEN
  // -------------------------------
  else if (
    lightingDifferencePercent > 20 &&
    lightingDifferencePercent <= 35
  ) {

    memory.startTime = null;

    unevenLightingStatus =
      "Slightly Uneven Lighting ⚠";

    unevenLightingSuggestion =
      "Lighting is slightly uneven but still acceptable.";

    console.log("⚠ Slightly Uneven Lighting");
  }

  // -------------------------------
  // MODERATELY UNEVEN
  // -------------------------------
  else if (
    lightingDifferencePercent > 35 &&
    lightingDifferencePercent <= 55
  ) {

    memory.startTime = null;

    unevenLightingStatus =
      "Uneven Lighting ⚠";

    unevenLightingSuggestion =
      "Try balancing lighting for better analysis quality.";

    console.log("⚠ Uneven Lighting");
  }

  // -------------------------------
  // SEVERE UNEVEN LIGHTING
  // -------------------------------
  else {

    if (!memory.startTime) {
      memory.startTime = performance.now();
    }

    const unevenDuration =
      performance.now() - memory.startTime;

    unevenLightingStatus =
      "Severe Uneven Lighting ❌";

    unevenLightingSuggestion =
      "Lighting imbalance is strongly affecting face analysis.";

    // popup only after 3 sec
    if (unevenDuration > 3000) {
      showUnevenLightingPopup = true;
    }

    console.log("❌ Severe Uneven Lighting");
  }

  // -------------------------------
  // SEVERITY LABEL
  // -------------------------------
  let severity = "good";

  if (
    lightingDifferencePercent > 20 &&
    lightingDifferencePercent <= 35
  ) {
    severity = "mild";
  }

  else if (
    lightingDifferencePercent > 35 &&
    lightingDifferencePercent <= 55
  ) {
    severity = "moderate";
  }

  else if (lightingDifferencePercent > 55) {
    severity = "severe";
  }

  // -------------------------------
  // RETURN
  // -------------------------------
  return {
    unevenLightingStatus,
    unevenLightingSuggestion,
    showUnevenLightingPopup,
    severity,
  };
};