export const unevenLightingCheck = (
  { lightingDifferencePercent },
  unevenLightingRef,
) => {
  let unevenLightingStatus = "";
  let unevenLightingSuggestion = "";
  let showUnevenLightingPopup = false;
  let lightingQualityScore = 100;
  let severity = "excellent";

  if (!unevenLightingRef.current) {
    unevenLightingRef.current = {
      startTime: null,
    };
  }

  const memory = unevenLightingRef.current;

  if (lightingDifferencePercent <= 30) {
    memory.startTime = null;
  } else if (lightingDifferencePercent <= 65) {
    memory.startTime = null;
    lightingQualityScore -= 10;
  } else {
    lightingQualityScore -= 20;
  }

  if (lightingQualityScore >= 90) {
    severity = "excellent";
  } else if (lightingQualityScore >= 75) {
    severity = "good";
  } else if (lightingQualityScore >= 55) {
    severity = "acceptable";
  } else if (lightingQualityScore >= 35) {
    severity = "challenging";
  } else {
    severity = "poor";
  }

  switch (severity) {
    case "excellent":
      unevenLightingStatus = "Excellent Lighting Balance - OK";
      unevenLightingSuggestion = "Lighting is evenly distributed.";
      break;
    case "good":
      unevenLightingStatus = "Good Lighting Balance - OK";
      unevenLightingSuggestion = "Lighting balance is suitable.";
      break;
    case "acceptable":
      unevenLightingStatus = "Slightly Uneven Lighting - Warning";
      unevenLightingSuggestion = "Minor lighting imbalance detected.";
      break;
    case "challenging":
      unevenLightingStatus = "Uneven Lighting - Warning";
      unevenLightingSuggestion = "Lighting imbalance may reduce accuracy.";
      break;
    case "poor":
      unevenLightingStatus = "Poor Lighting Balance - Issue";
      unevenLightingSuggestion = "Strong lighting imbalance detected.";
      break;
    default:
      unevenLightingStatus = "Lighting Balance Unknown";
      unevenLightingSuggestion = "Unable to evaluate lighting balance.";
  }

  if (severity === "poor") {
    if (!memory.startTime) {
      memory.startTime = performance.now();
    }

    const duration = performance.now() - memory.startTime;
    if (duration > 4000) {
      showUnevenLightingPopup = true;
    }
  } else {
    memory.startTime = null;
    showUnevenLightingPopup = false;
  }

  return {
    unevenLightingStatus,
    unevenLightingSuggestion,
    showUnevenLightingPopup,
    severity,
    lightingQualityScore,
  };
};
