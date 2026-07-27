const MISSING_FACE_FRAME_LIMIT = 10;

export function missingFaceCheck(ref) {
  if (!ref.current) {
    ref.current = {
      missingFrames: 0,
    };
  }

  ref.current.missingFrames += 1;
  const active = ref.current.missingFrames >= MISSING_FACE_FRAME_LIMIT;

  return {
    active,
    status: active ? "Face blocked or not visible - Issue" : "Face not detected",
    suggestion: active
      ? "Remove anything blocking your face and keep your face in view."
      : "Keep your face visible to the camera.",
    activePopup: active
      ? {
          title: "Face Blocked",
          message: "Analysis is paused because your face is blocked or not visible.",
          suggestion: "Remove the object in front of your face and look toward the camera.",
        }
      : null,
  };
}

export function resetMissingFaceCheck(ref) {
  if (ref.current) {
    ref.current.missingFrames = 0;
  }
}
