export function videoQualityEngine({

  lightingSeverity,

  lightingQualityScore,

  brightnessSeverity,

  brightnessQualityScore,

occlusionSeverity,
showFaceDistancePopup,

faceDistanceType,
occlusionQualityScore,

  showMultiFacePopup,
  blurSeverity,
blurQualityScore,

}) {

  let overallQualityScore = 100;

  const warnings = [];

  const blockingIssues = [];

  // --------------------------------
  // LIGHTING SEVERITY
  // --------------------------------
  if (lightingSeverity === "acceptable") {

    overallQualityScore -= 5;

    warnings.push(
      "Lighting slightly uneven"
    );
  }

  else if (
    lightingSeverity === "challenging"
  ) {

    overallQualityScore -= 15;

    warnings.push(
      "Lighting may affect accuracy"
    );
  }

  else if (
    lightingSeverity === "poor"
  ) {

    overallQualityScore -= 35;

    blockingIssues.push(
      "Poor lighting conditions"
    );
  }



if (
  brightnessSeverity === "acceptable"
) {

  overallQualityScore -= 10;

  warnings.push(
    "Brightness slightly suboptimal"
  );
}

else if (
  brightnessSeverity === "poor"
) {

  overallQualityScore -= 35;

  blockingIssues.push(
    "Poor face visibility"
  );
}
// --------------------------------
// BLUR
// --------------------------------
if (
  blurSeverity === "acceptable"
) {

  overallQualityScore -= 10;

  warnings.push(
    "Slight blur detected"
  );
}

else if (
  blurSeverity === "poor"
) {

  overallQualityScore -= 30;

  blockingIssues.push(
    "Image too blurry"
  );
}
  // --------------------------------
  // OCCLUSION
  // --------------------------------
 if (
  occlusionSeverity ===
  "acceptable"
) {

  overallQualityScore -= 10;

  warnings.push(
    "Partial face obstruction"
  );
}

else if (
  occlusionSeverity ===
  "poor"
) {

  overallQualityScore -= 35;

  blockingIssues.push(
    "Face occluded"
  );
}
  if (showFaceDistancePopup) {

    overallQualityScore -= 35;

  if (
  faceDistanceType ===
  "too_far"
) {

  blockingIssues.push(
    "Move closer to the camera"
  );
}

else if (
  faceDistanceType ===
  "too_close"
) {

  blockingIssues.push(
    "Move slightly away from the camera"
  );
}

else {

  blockingIssues.push(
    "Face distance unsuitable"
  );
}
  }
  // --------------------------------
  // MULTIPLE FACES
  // --------------------------------
  if (showMultiFacePopup) {

  overallQualityScore -= 45;

  blockingIssues.push(
    "Multiple faces detected"
  );
}

  // --------------------------------
  // CLAMP SCORE
  // --------------------------------
  overallQualityScore =
    Math.max(
      0,
      Math.min(100, overallQualityScore)
    );

  // --------------------------------
  // OVERALL SEVERITY
  // --------------------------------
  let overallSeverity = "excellent";

  if (overallQualityScore >= 85) {

    overallSeverity = "excellent";
  }

  else if (
    overallQualityScore >= 70
  ) {

    overallSeverity = "good";
  }

  else if (
    overallQualityScore >= 50
  ) {

    overallSeverity = "acceptable";
  }

  else if (
    overallQualityScore >= 30
  ) {

    overallSeverity = "challenging";
  }

  else {

    overallSeverity = "poor";
  }

  // --------------------------------
  // CONFIDENCE
  // --------------------------------
  const confidenceModifier =
    overallQualityScore / 100;
const shouldBlockAnalysis =
  blockingIssues.length > 0;
// --------------------------------
// ACTIVE POPUP
// --------------------------------
let activePopup = null;

// --------------------------------
// BRIGHTNESS
// --------------------------------
if (brightnessSeverity === "poor") {

  activePopup = {

    title:
      "Poor Face Visibility",

    message:
      "Your face is either too dark or too bright.",

    suggestion:
      "Adjust your lighting so your face is clearly visible.",
  };
}

 
else if (blurSeverity === "poor") {

  activePopup = {

    title:
      "Blurry Camera Feed",

    message:
      "The camera image is too blurry for reliable analysis.",

    suggestion:
      "Clean the camera lens or improve focus.",
  };
}

// --------------------------------
// OCCLUSION
// --------------------------------
else if (
  occlusionSeverity === "poor"
) {

  activePopup = {

    title:
      "Face Occluded",

    message:
      "Parts of your face are blocked or not visible.",

    suggestion:
      "Ensure your full face is visible to the camera.",
  };
}

// --------------------------------
// MULTI FACE
// --------------------------------
else if (showMultiFacePopup) {

  activePopup = {

    title:
      "Multiple Faces Detected",

    message:
      "More than one person is visible in the frame.",

    suggestion:
      "Ensure only one person is present in the camera view.",
  };
}


if (showFaceDistancePopup){
  if (faceDistanceType == "too_far"){


activePopup = {

    title:
      "face distance unsuitable",

    message:
      "you are too far from the camera.",

    suggestion:
      "Try coming closer to camera .",
  };


  }else if (faceDistanceType== "too_close"){


activePopup = {

    title:
      "face distance unsuitable",

    message:
      "you are too close to the camera.",

    suggestion:
      "Try steping back from the  camera .",
  };


  }


 

  
}




// --------------------------------
// LIGHTING BALANCE
// --------------------------------
else if (
  lightingSeverity === "poor"
) {

  activePopup = {

    title:
      "Uneven Lighting",

    message:
      "Lighting imbalance is affecting facial visibility.",

    suggestion:
      "Try sitting facing the light source evenly.",
  };
}
  // --------------------------------
  // RETURN
  // --------------------------------
  return {

    overallQualityScore,

    overallSeverity,

    warnings,

    blockingIssues,

    confidenceModifier,

  shouldBlockAnalysis,

  activePopup,
  };
}