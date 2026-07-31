const MISSING_FACE_FRAME_LIMIT = 10;

export function missingFaceCheck(ref, { personDetected = false } = {}) {
  if (!ref.current) {
    ref.current = {
      missingFrames: 0,
    };
  }

  ref.current.missingFrames += 1;
  const active = ref.current.missingFrames >= MISSING_FACE_FRAME_LIMIT;
  const activeStatus = personDetected
    ? "Person detected, face missing - Issue"
    : "Face missing - Issue";
  const activeMessage = personDetected
    ? "Analysis is paused because a person is present but no face is detected."
    : "Analysis is paused because no face is detected.";

  return {
    active,
    status: active ? activeStatus : "Face not detected",
    suggestion: active
      ? "Keep your face visible and look toward the camera."
      : "Keep your face visible to the camera.",
    activePopup: active
      ? {
          title: "Face Missing",
          message: activeMessage,
          suggestion: "Move your face into view and look toward the camera.",
        }
      : null,
  };
}

export function resetMissingFaceCheck(ref) {
  if (ref.current) {
    ref.current.missingFrames = 0;
  }
}
