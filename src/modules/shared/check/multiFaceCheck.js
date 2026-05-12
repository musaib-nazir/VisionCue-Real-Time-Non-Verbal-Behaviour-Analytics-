// modules/shared/check/multiFaceCheck.js
export function multiFaceCheck(metrics, ref) {
  const { faceCount, multipleFacesDetected } = metrics;

 
  if (!ref.current) {
    ref.current = {
      history: [],
      active: false,
    };
  }

  const memory = ref.current;

  const score = multipleFacesDetected ? 1 : 0;

  memory.history.push(score);


  if (memory.history.length > 10) {
    memory.history.shift();
  }


  const avg =
    memory.history.reduce((a, b) => a + b, 0) /
    memory.history.length;

  if (avg >= 0.4) {
    memory.active = true;
  } else if (avg <= 0.2) {
    memory.active = false;
  }


  let multiFaceStatus = "Single face detected ✅";
  let multiFaceSuggestion = "Only one person should be visible";
  let showMultiFacePopup = false;


  if (memory.active) {
    multiFaceStatus = "Multiple faces detected ❌";
    multiFaceSuggestion =
      "Ensure only one person is visible in the camera.";
    showMultiFacePopup = true;


    console.log("Multiple faces detected");
  }else{

    multiFaceStatus = "Single face detected ✅";
    multiFaceSuggestion = "Only one person should be visible";
    showMultiFacePopup = false;
    console.log("Single face detected");
  }

  return {
    multiFaceStatus,
    multiFaceSuggestion,
    showMultiFacePopup,
    faceCount,
  };
}