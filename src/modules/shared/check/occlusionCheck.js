// modules/shared/check/occlusioncheck.js

export function occlusionCheck(metrics, ref) {
  const {
    handOnFace,
    areaDrop,
    occlusionScore,
    landmarkIntegrityIssue,
  } = metrics;

 
  if (!ref.current) {
    ref.current = {
      scoreHistory: [],
      active: false,
    };
  }

  const memory = ref.current;

  const decayFactor = 0.9;
  memory.scoreHistory = memory.scoreHistory.map(
    (v) => v * decayFactor
  );

  // -------------------------------
  // PUSH NEW SCORE
  // -------------------------------
  memory.scoreHistory.push(occlusionScore);

  if (memory.scoreHistory.length > 10) {
    memory.scoreHistory.shift();
  }

  // -------------------------------
  // AVERAGE SCORE
  // -------------------------------
  const avgScore =
    memory.scoreHistory.reduce((a, b) => a + b, 0) /
    memory.scoreHistory.length;

  // -------------------------------
  // HYSTERESIS
  // -------------------------------
  const ACTIVATION_THRESHOLD = 0.6;
  const DEACTIVATION_THRESHOLD = 0.3;

  if (avgScore >= ACTIVATION_THRESHOLD) {
    memory.active = true;
  } else if (avgScore <= DEACTIVATION_THRESHOLD) {
    memory.active = false;
  }

  // -------------------------------
  // FINAL DECISION (PRIORITY FIXED)
  // -------------------------------
  let occlusionStatus = "Face clearly visible ✅";
  let occlusionSuggestion = "";
  let showOcclusionPopup = false;

  if (memory.active) {
    showOcclusionPopup = true;

    if (landmarkIntegrityIssue) {
      occlusionStatus = "Face not visible ❌";
      occlusionSuggestion =
        "Remove any object blocking your face.";
    } else if (handOnFace) {
      occlusionStatus = "Hand blocking face ❌";
      occlusionSuggestion =
        "Avoid covering your eyes, nose, or mouth.";
    } else if (areaDrop) {
      occlusionStatus = "Face unstable ⚠";
      occlusionSuggestion =
        "Keep your face steady and centered.";
    } else {
      occlusionStatus = "Face occluded ❌";
      occlusionSuggestion =
        "Ensure your face is fully visible.";
    }
  }

  return {
    occlusionStatus,
    occlusionSuggestion,
    showOcclusionPopup,
  };
}