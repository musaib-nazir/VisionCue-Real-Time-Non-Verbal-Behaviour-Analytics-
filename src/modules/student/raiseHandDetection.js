import { clamp } from "./attentionTracking";

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function isValidHand(lms) {
  if (!lms || lms.length < 21) return false;

  if (
    !lms[0] ||
    !lms[4] ||
    !lms[8] ||
    !lms[12] ||
    !lms[16] ||
    !lms[20]
  ) {
    return false;
  }

  const wrist = lms[0];
  const middleTip = lms[12];

  const handSize = dist(wrist, middleTip);

  if (handSize < 0.05) return false;

  let inBounds = 0;

  for (const point of lms) {
    if (
      point &&
      point.x >= -0.1 &&
      point.x <= 1.1 &&
      point.y >= -0.1 &&
      point.y <= 1.1
    ) {
      inBounds += 1;
    }
  }

  if (inBounds < 15) return false;

  const palm = lms[9] || lms[5];

  if (!palm) return false;

  const palmSize = dist(wrist, palm);

  if (palmSize < 0.02 || palmSize > 0.3) {
    return false;
  }

  const avgFingerDist =
    (
      dist(lms[8], palm) +
      dist(lms[12], palm) +
      dist(lms[16], palm) +
      dist(lms[20], palm)
    ) / 4;

  return (
    avgFingerDist >= palmSize * 0.2 &&
    avgFingerDist <= palmSize * 5
  );
}

export function fingerCurled(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) {
    return 0;
  }

  return (
    dist(lms[tip], lms[mcp]) <
    dist(lms[pip], lms[mcp]) * 1.05
      ? 1
      : 0
  );
}

export function fingerExtended(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) {
    return 0;
  }

  return (
    dist(lms[tip], lms[mcp]) >
    dist(lms[pip], lms[mcp]) * 1.1
      ? 1
      : 0
  );
}

export function thumbGestureScoresFromLandmarks(lms,  faceLandmarks) {
  if (!isValidHand(lms)) {
    return { up: 0, down: 0 };
  }

  const wrist = lms[0];
  const palmRef = lms[9] || lms[5];

  const palm = dist(wrist, palmRef) || 0.001;

  const othersCurled =
    (
      fingerCurled(lms, 8, 6, 5) +
      fingerCurled(lms, 12, 10, 9) +
      fingerCurled(lms, 16, 14, 13) +
      fingerCurled(lms, 20, 18, 17)
    ) / 4;

  const thumbTip = lms[4];
  const thumbMcp = lms[2];

if (
  !thumbTip ||
  !thumbMcp ||
  !faceLandmarks
) {
  return { up: 0, down: 0 };
}
  // --------------------------------
// HAND TOO CLOSE TO FACE?
// --------------------------------

// --------------------------------
// FACE REFERENCES
// --------------------------------

const nose =
  faceLandmarks[1];

const chin =
  faceLandmarks[152];

if (!nose || !chin) {
  return { up: 0, down: 0 };
}

// --------------------------------
// PALM CENTER
// --------------------------------

const palmCenter = {

  x:
    (
      lms[0].x +
      lms[5].x +
      lms[9].x +
      lms[13].x +
      lms[17].x
    ) / 5,

  y:
    (
      lms[0].y +
      lms[5].y +
      lms[9].y +
      lms[13].y +
      lms[17].y
    ) / 5,
};

const faceSize =
  dist(nose, chin);

// --------------------------------
// THUMB FEATURES
// --------------------------------

const thumbExt =
  clamp(
    dist(thumbTip, thumbMcp) /
    (palm * 0.9)
  );

const dy =
  thumbTip.y - thumbMcp.y;

const scale =
  clamp(palm, 0.12, 0.28);

const orientUp =
  clamp(-dy / scale);

const orientDown =
  clamp(dy / scale);

// --------------------------------
// STRICT CONDITIONS
// --------------------------------

// thumb must clearly point upward
const thumbClearlyUp =
  orientUp > 0.75;

// thumb must be strongly extended
const thumbStronglyExtended =
  thumbExt > 0.8;

// fingers must be curled
const fingersProperlyCurled =
  othersCurled > 0.7;

// hand must be away from face
const handAwayFromFace =
  dist(palmCenter, nose) >
  faceSize * 1.5;

// --------------------------------
// FINAL STRICT THUMBS UP
// --------------------------------

let up = 0;

if (
  thumbClearlyUp &&
  thumbStronglyExtended &&
  fingersProperlyCurled &&
  handAwayFromFace
) {

  up = 1;
}

const thumbClearlyDown =
  orientDown > 0.75;

// thumb must be strongly extended
const thumbStronglyExtendedDown =
  thumbExt > 0.8;

// fingers must be curled
const fingersProperlyCurledDown =
  othersCurled > 0.7;

// hand must be away from face
const handAwayFromFaceDown =
  dist(palmCenter, nose) >
  faceSize * 1.5;

// --------------------------------
// FINAL STRICT THUMBS DOWN
// --------------------------------

let down = 0;

if (
  thumbClearlyDown &&
  thumbStronglyExtendedDown &&
  fingersProperlyCurledDown &&
  handAwayFromFaceDown
) {

  down = 1;
}

  return { up, down };
}

export function detectThumbs(
  handResult,
  faceLandmarks
) {

  let bestUp = 0;
  let bestDown = 0;

  for (const hand of handResult?.landmarks ?? []) {

    const { up, down } =
    thumbGestureScoresFromLandmarks(
  hand,
  faceLandmarks
)

    bestUp = Math.max(bestUp, up);
    bestDown = Math.max(bestDown, down);
  }

  return {
    up: bestUp,
    down: bestDown,
  };
}

// ========================================
// UPDATED RAISE HAND DETECTION
// ========================================

export function raiseHandScoreFromLandmarks(
  lms,
  faceLandmarks
) {

  if (!isValidHand(lms)) {
    return 0;
  }

  if (!faceLandmarks) {
    return 0;
  }

  const forehead =
    faceLandmarks[10];

  const chin =
    faceLandmarks[152];

  if (!forehead || !chin) {
    return 0;
  }

  const faceHeight =
    Math.abs(chin.y - forehead.y);

  const wrist = lms[0];

  const palmRef =
    lms[9] || lms[5];

  const palmSize =
    dist(wrist, palmRef) || 0.001;

  // --------------------------------
  // FINGER EXTENSION
  // --------------------------------

  const extendedCount =
    fingerExtended(lms, 8, 6, 5) +
    fingerExtended(lms, 12, 10, 9) +
    fingerExtended(lms, 16, 14, 13) +
    fingerExtended(lms, 20, 18, 17);

  const fingersExtended =
    extendedCount / 4;

  // require at least 3 fingers
  if (extendedCount < 3) {
    return 0;
  }

  // --------------------------------
  // HAND GEOMETRY
  // --------------------------------

  const avgFingerTipY =
    (
      lms[8].y +
      lms[12].y +
      lms[16].y +
      lms[20].y
    ) / 4;

  const avgFingerTipX =
    (
      lms[8].x +
      lms[12].x +
      lms[16].x +
      lms[20].x
    ) / 4;

  const palmCenterX =
    (
      lms[0].x +
      lms[5].x +
      lms[9].x +
      lms[13].x +
      lms[17].x
    ) / 5;

  const palmCenterY =
    (
      lms[0].y +
      lms[5].y +
      lms[9].y +
      lms[13].y +
      lms[17].y
    ) / 5;

  // --------------------------------
  // HAND MUST BE VERTICAL
  // --------------------------------

  const verticalOriented =
    clamp(
      1 -
      Math.abs(
        avgFingerTipX -
        palmCenterX
      ) / 0.15
    );

  // --------------------------------
  // FINGERS ABOVE WRIST
  // --------------------------------

  const handRaised =
    clamp(
      (wrist.y - avgFingerTipY) /
      0.2
    );

  const fingersClearlyAboveWrist =
    clamp(
      (wrist.y - avgFingerTipY) /
      (palmSize * 1.2)
    );

  // --------------------------------
  // HAND MUST BE ABOVE HEAD
  // --------------------------------

  const aboveHead =
    clamp(
      (
        forehead.y -
        palmCenterY
      ) /
      (faceHeight * 0.8)
    );

  // --------------------------------
  // REAL RAISED POSE
  // --------------------------------

  const raisedPose =
    Math.min(
      aboveHead,
      fingersClearlyAboveWrist
    );

  // reject weak poses
  if (raisedPose < 0.25) {
    return 0;
  }

  // --------------------------------
  // FINAL SCORE
  // --------------------------------

  return clamp(
    0.4 * raisedPose +
    0.25 * handRaised +
    0.2 * fingersExtended +
    0.15 * verticalOriented
  );
}

export function detectRaiseHand(
  handResult,
  faceLandmarks
) {

  let bestScore = 0;

  for (const hand of handResult?.landmarks ?? []) {

    bestScore = Math.max(
      bestScore,
      raiseHandScoreFromLandmarks(
        hand,
        faceLandmarks
      )
    );
  }

  return bestScore;
}