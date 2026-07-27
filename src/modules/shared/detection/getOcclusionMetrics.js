// modules/shared/detection/getOcclusionMetrics.js

export function getOcclusionMetrics({
  landmarks,
  hands,
  faceBox,
  prevFaceArea,
}) {
  let handOnFace = false;
  let areaDrop = false;
  let landmarkIntegrityIssue = false;
  let occlusionScore = 0;

  if (!landmarks) {
    return {
      handOnFace,
      areaDrop,
      landmarkIntegrityIssue,
      occlusionScore,
    };
  }

  const { minX, maxX, minY, maxY, FaceArea } = faceBox || {};
  const faceWidth = Math.abs(maxX - minX);

  // -------------------------------
  // IMPORTANT FACIAL POINTS
  // -------------------------------
  const importantPoints = [
    landmarks[33],  // left eye
    landmarks[133],
    landmarks[362], // right eye
    landmarks[263],
    landmarks[1],   // nose
    landmarks[61],  // mouth
    landmarks[291],
  ].filter(Boolean);

  // -------------------------------
  // DISTANCE HELPER
  // -------------------------------
  function isNear(p1, p2, threshold = 0.1) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  // -------------------------------
  // 1) HAND → IMPORTANT REGION (MULTI HIT)
  // -------------------------------
  // -------------------------------
// 1) CRITICAL REGION OCCLUSION
// -------------------------------
if (hands && hands.length > 0) {

  const blockedRegions = new Set();

  for (let hand of hands) {

    for (let point of hand) {

      // LEFT EYE
      if (
        isNear(point, landmarks[33], 0.05) ||
        isNear(point, landmarks[133], 0.05)
      ) {
        blockedRegions.add("leftEye");
      }

      // RIGHT EYE
      if (
        isNear(point, landmarks[263], 0.05) ||
        isNear(point, landmarks[362], 0.05)
      ) {
        blockedRegions.add("rightEye");
      }

      // NOSE
      if (
        isNear(point, landmarks[1], 0.05)
      ) {
        blockedRegions.add("nose");
      }

      // MOUTH
      if (
        isNear(point, landmarks[61], 0.05) ||
        isNear(point, landmarks[291], 0.05)
      ) {
        blockedRegions.add("mouth");
      }
    }
  }

  // --------------------------------
  // REAL OCCLUSION CONDITION
  // --------------------------------

  const eyesBlocked =
    blockedRegions.has("leftEye") &&
    blockedRegions.has("rightEye");

  const noseBlocked =
    blockedRegions.has("nose");

  const mouthBlocked =
    blockedRegions.has("mouth");

  // ONLY trigger when analysis becomes difficult
  if (
    (eyesBlocked && noseBlocked) ||
    (eyesBlocked && mouthBlocked)
  ) {

    handOnFace = true;

    occlusionScore += 0.8;
  }
}

//FACE COVERAGE PERCENTAGE
 if (hands && hands.length > 0) {

  let totalPoints = 0;
  let pointsInside = 0;

  for (let hand of hands) {

    for (let point of hand) {

      totalPoints++;

      if (
        point.x > minX &&
        point.x < maxX &&
        point.y > minY &&
        point.y < maxY
      ) {
        pointsInside++;
      }
    }
  }

  const coverage =
    pointsInside / totalPoints;

  // only meaningful coverage matters
  if (coverage > 0.35) {

    occlusionScore += 0.3;
  }
}

  // -------------------------------
  // 3) LANDMARK COUNT INTEGRITY
  // -------------------------------
  if (landmarks.length < 400) {
    landmarkIntegrityIssue = true;
    occlusionScore += 0.5;
  }

  // -------------------------------
  // 4) GEOMETRY CHECK (SCALE-AWARE)
  // -------------------------------
  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const leftEyeOuter = landmarks[33];
  const leftEyeInner = landmarks[133];
  const rightEyeOuter = landmarks[263];
  const rightEyeInner = landmarks[362];
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];

  if (leftEyeOuter && leftEyeInner) {
    const width = dist(leftEyeOuter, leftEyeInner);
    if (width < faceWidth * 0.02) {
      landmarkIntegrityIssue = true;
      occlusionScore += 0.4;
    }
  }

  if (rightEyeOuter && rightEyeInner) {
    const width = dist(rightEyeOuter, rightEyeInner);
    if (width < faceWidth * 0.02) {
      landmarkIntegrityIssue = true;
      occlusionScore += 0.4;
    }
  }

  if (mouthLeft && mouthRight) {
    const width = dist(mouthLeft, mouthRight);
    if (width < faceWidth * 0.02) {
      landmarkIntegrityIssue = true;
      occlusionScore += 0.3;
    }
  }

  // -------------------------------
  // 5) FACE AREA DROP
  // -------------------------------
  if (prevFaceArea && FaceArea) {
    const change =
      Math.abs(FaceArea - prevFaceArea) / prevFaceArea;

    if (change > 0.4) {
      areaDrop = true;
      occlusionScore += 0.3;
    }
  }

  // -------------------------------
  // RETURN
  // -------------------------------
  return {
    handOnFace,
    areaDrop,
    landmarkIntegrityIssue,
    occlusionScore,
  };
}
