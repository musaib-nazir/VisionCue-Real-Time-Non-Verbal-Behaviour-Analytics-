export function multiFaceCheck(metrics, ref) {
  const { faceCount, multipleFacesDetected } = metrics;

  if (!ref.current) {
    ref.current = {
      history: [],
      active: false,
      startTime: null,
    };
  }

  const memory = ref.current;
  const score = multipleFacesDetected ? 1 : 0;
  memory.history.push(score);

  if (memory.history.length > 15) {
    memory.history.shift();
  }

  const avg =
    memory.history.reduce((total, value) => total + value, 0) /
    memory.history.length;

  if (avg > 0.4) {
    if (!memory.startTime) {
      memory.startTime = performance.now();
    }

    const duration = performance.now() - memory.startTime;
    if (duration > 5000) {
      memory.active = true;
    }
  } else {
    memory.startTime = null;
    memory.active = false;
  }

  if (memory.active) {
    return {
      multiFaceStatus: "Multiple faces detected - Issue",
      multiFaceSuggestion: "Ensure only one person is visible in the camera.",
      showMultiFacePopup: true,
      faceCount,
    };
  }

  return {
    multiFaceStatus: "Single face detected - OK",
    multiFaceSuggestion: "Only one person should be visible",
    showMultiFacePopup: false,
    faceCount,
  };
}
