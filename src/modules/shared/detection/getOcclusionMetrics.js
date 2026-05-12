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
  if (hands && hands.length > 0) {
    let hitCount = 0;

    for (let hand of hands) {
      for (let point of hand) {
        for (let lm of importantPoints) {
          if (isNear(point, lm, 0.1)) {
            hitCount++;
          }
        }
      }
    }

    if (hitCount >= 3) {
      handOnFace = true;
      occlusionScore += 0.8;
    }
  }

  // -------------------------------
  // 2) FACE BOX OVERLAP (BACKUP SIGNAL)
  // -------------------------------
  if (hands && hands.length > 0) {
    let boxHit = false;
    const margin = 0.05;

    for (let hand of hands) {
      for (let point of hand) {
        if (
          point.x > (minX - margin) &&
          point.x < (maxX + margin) &&
          point.y > (minY - margin) &&
          point.y < (maxY + margin)
        ) {
          boxHit = true;
          break;
        }
      }
      if (boxHit) break;
    }

    if (boxHit) {
      occlusionScore += 0.4;
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