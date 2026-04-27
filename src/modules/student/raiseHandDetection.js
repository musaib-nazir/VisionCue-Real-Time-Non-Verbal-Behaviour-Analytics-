import { clamp } from "./attentionTracking";

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function isValidHand(lms) {
  if (!lms || lms.length < 21) return false;
  if (!lms[0] || !lms[4] || !lms[8] || !lms[12] || !lms[16] || !lms[20])
    return false;
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
  if (palmSize < 0.02 || palmSize > 0.3) return false;
  const avgFingerDist =
    (dist(lms[8], palm) +
      dist(lms[12], palm) +
      dist(lms[16], palm) +
      dist(lms[20], palm)) /
    4;
  return avgFingerDist >= palmSize * 0.2 && avgFingerDist <= palmSize * 5;
}

export function fingerCurled(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) return 0;
  return dist(lms[tip], lms[mcp]) < dist(lms[pip], lms[mcp]) * 1.05 ? 1 : 0;
}

export function fingerExtended(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) return 0;
  return dist(lms[tip], lms[mcp]) > dist(lms[pip], lms[mcp]) * 1.1 ? 1 : 0;
}

export function thumbGestureScoresFromLandmarks(lms) {
  if (!isValidHand(lms)) return { up: 0, down: 0 };
  const wrist = lms[0];
  const palmRef = lms[9] || lms[5];
  const palm = dist(wrist, palmRef) || 0.001;
  const othersCurled =
    (fingerCurled(lms, 8, 6, 5) +
      fingerCurled(lms, 12, 10, 9) +
      fingerCurled(lms, 16, 14, 13) +
      fingerCurled(lms, 20, 18, 17)) /
    4;
  const thumbTip = lms[4];
  const thumbMcp = lms[2];
  if (!thumbTip || !thumbMcp) return { up: 0, down: 0 };
  const thumbExt = clamp(dist(thumbTip, thumbMcp) / (palm * 0.9));
  const dy = thumbTip.y - thumbMcp.y;
  const scale = clamp(palm, 0.12, 0.28);
  const orientUp = clamp(-dy / scale);
  const orientDown = clamp(dy / scale);
  const up = clamp(
    0.45 * othersCurled + 0.25 * thumbExt + orientUp - 0.05 * orientDown,
  );
  let down = clamp(
    0.4 * othersCurled + 0.25 * thumbExt + 1.15 * orientDown - 0.05 * orientUp,
  );
  if (orientDown > 0.6) down = clamp(down + 0.08);
  return { up, down };
}


export function detectThumbs(handResult) {
  let bestUp = 0;
  let bestDown = 0;
  for (const hand of handResult?.landmarks ?? []) {
    const { up, down } = thumbGestureScoresFromLandmarks(hand);
    bestUp = Math.max(bestUp, up);
    bestDown = Math.max(bestDown, down);
  }
  return { up: bestUp, down: bestDown };
}

export function raiseHandScoreFromLandmarks(lms) {
  if (!isValidHand(lms)) return 0;
  const wrist = lms[0];
  const palmRef = lms[9] || lms[5];
  dist(wrist, palmRef);
  const fingersExtended =
    (fingerExtended(lms, 8, 6, 5) +
      fingerExtended(lms, 12, 10, 9) +
      fingerExtended(lms, 16, 14, 13) +
      fingerExtended(lms, 20, 18, 17)) /
    4;
  const avgFingerTipY = (lms[8].y + lms[12].y + lms[16].y + lms[20].y) / 4;
  const handRaised = clamp((wrist.y - avgFingerTipY) / 0.2);
  const avgFingerTipX = (lms[8].x + lms[12].x + lms[16].x + lms[20].x) / 4;
  const palmCenterX =
    (lms[0].x + lms[5].x + lms[9].x + lms[13].x + lms[17].x) / 5;
  const verticalOriented = clamp(
    1 - Math.abs(avgFingerTipX - palmCenterX) / 0.15,
  );
  const centeredness = clamp(1 - Math.abs(palmCenterX - 0.5) / 0.3);
  return clamp(
    0.4 * fingersExtended +
      0.35 * handRaised +
      0.15 * verticalOriented +
      0.1 * centeredness,
  );
}

export function detectRaiseHand(handResult) {
  let bestScore = 0;
  for (const hand of handResult?.landmarks ?? []) {
    bestScore = Math.max(bestScore, raiseHandScoreFromLandmarks(hand));
  }
  return bestScore;
}