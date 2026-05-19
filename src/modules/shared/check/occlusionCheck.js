export function occlusionCheck(metrics, ref) {
  const { handOnFace, areaDrop, occlusionScore, landmarkIntegrityIssue } =
    metrics;

  if (!ref.current) {
    ref.current = {
      scoreHistory: [],
      active: false,
    };
  }

  const memory = ref.current;
  memory.scoreHistory = memory.scoreHistory.map((value) => value * 0.9);
  memory.scoreHistory.push(occlusionScore);

  if (memory.scoreHistory.length > 10) {
    memory.scoreHistory.shift();
  }

  const avgScore =
    memory.scoreHistory.reduce((total, value) => total + value, 0) /
    memory.scoreHistory.length;

  if (avgScore >= 0.6) {
    memory.active = true;
  } else if (avgScore <= 0.3) {
    memory.active = false;
  }

  let occlusionStatus = "Face clearly visible - OK";
  let occlusionSuggestion = "";
  let showOcclusionPopup = false;
  let occlusionSeverity = "excellent";
  let occlusionQualityScore = 100;

  if (memory.active) {
    if (landmarkIntegrityIssue) {
      occlusionSeverity = "poor";
      occlusionQualityScore -= 45;
      showOcclusionPopup = true;
      occlusionStatus = "Face not visible - Issue";
      occlusionSuggestion = "Remove any object blocking your face.";
    } else if (handOnFace) {
      occlusionSeverity = "poor";
      occlusionQualityScore -= 35;
      showOcclusionPopup = true;
      occlusionStatus = "Hand blocking face - Issue";
      occlusionSuggestion = "Avoid covering eyes, nose, or mouth.";
    } else if (areaDrop) {
      occlusionSeverity = "acceptable";
      occlusionQualityScore -= 10;
      occlusionStatus = "Face unstable - Warning";
      occlusionSuggestion = "Keep your face steady and centered.";
    } else {
      occlusionSeverity = "acceptable";
      occlusionQualityScore -= 15;
      occlusionStatus = "Face partially occluded - Warning";
      occlusionSuggestion = "Ensure your face is fully visible.";
    }
  }

  return {
    occlusionStatus,
    occlusionSuggestion,
    showOcclusionPopup,
    occlusionSeverity,
    occlusionQualityScore,
  };
}
