import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

const INITIAL_LEARNER = {
  RaiseHand: 0,
  Agreeing: 0,
  Disagreeing: 0,
  Thinking: 0,
  Bored: 0,
  Confused: 0,
  Surprised: 0,
  Neutral: 1,
};

const INITIAL_UI = {
  attention: 0,
  topEmotion: "Neutral",
  brightness: 0,
  lightingStatus: "checking...",
  lightingSuggestion: "Checking lighting...",
  showLightingPopup: false,

  showUnevenLightingPopup: false,
  unevenLightingStatus: "Checking Light Balance",
  unevenLightingSuggestion: "Checking for uneven lighting...",
  faceDistanceStatus: "Checking Distance",
  faceDistanceSuggestion:
    "Checking if you're the right distance from the camera...",

  showFaceDistancePopup: false,

  facePositionstatus: "Checking Face Position,,,,,",
  facePositionSuggestion:
    "Checking if your face is well positioned in the frame...",
  showFacePositionPopup: false,

  fps: "fps: --",
  learner: INITIAL_LEARNER,
  gestureLevels: { raiseHand: 0, agree: 0, disagree: 0 },
  gestureCounts: { raiseHand: 0, agree: 0, disagree: 0 },
  notice:
    "On-device only. Video never leaves your browser. Works best over HTTPS (or localhost), good lighting, and a single face in view.",
  hasError: false,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createEMA(alpha) {
  let y = 0;
  let init = false;
  return (x) => {
    y = init ? alpha * y + (1 - alpha) * x : x;
    init = true;
    return y;
  };
}

function createRuntimeState() {
  return {
    headHist: [],
    blinkTimes: [],
    prevBlink: 0,
    gazeHist: [],
    attnHist: [],
    learnerStateHist: {
      Agreeing: [],
      Disagreeing: [],
      Confused: [],
      Thinking: [],
      Bored: [],
      Surprised: [],
      RaiseHand: [],
    },
    emaUp: createEMA(0.7),
    emaDown: createEMA(0.5),
    emaRaiseHand: createEMA(0.6),
    attnEMA: createEMA(0.85),
    thumbUpLevel: 0,
    thumbDownLevel: 0,
    raiseHandLevel: 0,
    thumbUpCount: 0,
    thumbDownCount: 0,
    raiseHandCount: 0,
    prevUpActive: false,
    prevDownActive: false,
    prevRaiseHandActive: false,
    sparkBuf: new Array(180).fill(0),
    frames: 0,
    lastFpsUpdate: performance.now(),
  };
}

function bs(blendshapes, name) {
  if (!blendshapes?.length) return 0;
  const categories = blendshapes[0].categories ?? [];
  const match = categories.find((category) => category.categoryName === name);
  return match ? match.score : 0;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function headTiltDegFromEyes(faceLM) {
  if (!faceLM || faceLM.length < 264) return 0;
  const left = faceLM[33];
  const right = faceLM[263];
  if (!left || !right) return 0;
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
}

function chinPoint(faceLM) {
  if (!faceLM?.length) return { x: 0.5, y: 0.9 };
  return (
    faceLM[152] ||
    faceLM[Math.floor(faceLM.length * 0.95)] || { x: 0.5, y: 0.9 }
  );
}

function mouthCenter(faceLM) {
  if (!faceLM?.length) return { x: 0.5, y: 0.65 };
  if (faceLM.length > 15) {
    const a = faceLM[13] || faceLM[Math.floor(faceLM.length * 0.6)];
    const b = faceLM[14] || faceLM[Math.floor(faceLM.length * 0.62)];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  let minx = 1;
  let miny = 1;
  let maxx = 0;
  let maxy = 0;
  for (const point of faceLM) {
    minx = Math.min(minx, point.x);
    miny = Math.min(miny, point.y);
    maxx = Math.max(maxx, point.x);
    maxy = Math.max(maxy, point.y);
  }
  return { x: (minx + maxx) / 2, y: miny + (maxy - miny) * 0.7 };
}

function cheekPoints(faceLM) {
  if (!faceLM?.length) {
    return [
      { x: 0.42, y: 0.58 },
      { x: 0.58, y: 0.58 },
    ];
  }

  return [
    faceLM[205] || faceLM[187] || faceLM[0],
    faceLM[425] || faceLM[411] || faceLM[0],
  ];
}

function headOrientationPenalty(yawDeg = 0, pitchDeg = 0) {
  const yawSoft = 8;
  const yawHard = 30;
  const pitchDown = 5;
  const pitchDownSoft = 20;
  const pitchUpSoft = 8;
  const pitchUpHard = 25;
  const pyaw = clamp((Math.abs(yawDeg) - yawSoft) / (yawHard - yawSoft));
  let ppitch = 0;
  if (pitchDeg < -pitchDown) {
    ppitch = clamp(
      (Math.abs(pitchDeg) - pitchDown) / (pitchDownSoft - pitchDown),
    );
  } else if (pitchDeg > pitchUpSoft) {
    ppitch = clamp((pitchDeg - pitchUpSoft) / (pitchUpHard - pitchUpSoft));
  }
  return Math.max(pyaw, ppitch);
}

function computeAttention(blend, yawDeg = 0, pitchDeg = 0) {
  const eyesOpen =
    1 - (bs(blend, "eyeBlinkLeft") + bs(blend, "eyeBlinkRight")) / 2;
  const gazeLeft =
    (bs(blend, "eyeLookInLeft") + bs(blend, "eyeLookOutRight")) / 2;
  const gazeRight =
    (bs(blend, "eyeLookOutLeft") + bs(blend, "eyeLookInRight")) / 2;
  const gazeHoriz = Math.max(gazeLeft, gazeRight);
  const gazeUp = (bs(blend, "eyeLookUpLeft") + bs(blend, "eyeLookUpRight")) / 2;
  const gazeDown =
    (bs(blend, "eyeLookDownLeft") + bs(blend, "eyeLookDownRight")) / 2;
  const gazeUpPenalty = clamp((gazeUp - 0.05) / 0.3);
  const gazeDownPenalty = clamp((gazeDown - 0.25) / 0.5);
  const gazeHorizPenalty = clamp((gazeHoriz - 0.08) / 0.35);
  const gazePenalty = Math.max(
    gazeUpPenalty * 1.5,
    gazeHorizPenalty * 1.3,
    gazeDownPenalty * 0.6,
  );
  const eyesOnScreen = clamp(1 - gazePenalty);
  const headScore = 1 - headOrientationPenalty(yawDeg, pitchDeg);
  return clamp(0.7 * eyesOnScreen + 0.15 * headScore + 0.15 * clamp(eyesOpen));
}

function pushTimedValue(list, item, cutoffMs) {
  list.push(item);
  const cutoff = item.t - cutoffMs;
  while (list.length && list[0].t < cutoff) list.shift();
}

function recentVariance(list) {
  if (!list.length) return 0;
  const values = list.map((item) => item.v);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  );
}

function pushAttention(runtime, score) {
  pushTimedValue(runtime.attnHist, { t: performance.now(), score }, 3000);
}

function getAggregatedAttention(runtime, currentScore) {
  if (runtime.attnHist.length < 5) return currentScore;
  const now = performance.now();
  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of runtime.attnHist) {
    const weight = Math.exp(-(now - item.t) / 1200);
    weightedSum += item.score * weight;
    totalWeight += weight;
  }
  const historicalAvg =
    totalWeight > 0 ? weightedSum / totalWeight : currentScore;
  const scores = runtime.attnHist.map((item) => item.score);
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance =
    scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
  const consistencyFactor = clamp(1 - Math.sqrt(variance) / 0.25);
  const currentWeight = 0.3 + 0.4 * consistencyFactor;
  return clamp(
    currentWeight * currentScore + (1 - currentWeight) * historicalAvg,
  );
}

function pushLearnerStates(runtime, states) {
  const t = performance.now();
  for (const [key, value] of Object.entries(states)) {
    const history = runtime.learnerStateHist[key];
    if (!history) continue;
    pushTimedValue(history, { t, score: value }, 5000);
  }
}

function getAggregatedLearnerStates(runtime) {
  const aggregated = {};
  for (const [key, history] of Object.entries(runtime.learnerStateHist)) {
    aggregated[key] = history.length
      ? history.reduce((sum, item) => sum + item.score, 0) / history.length
      : 0;
  }
  return aggregated;
}

function forwardYawPitchFromMatrix(matrix) {
  if (!matrix) return null;
  const yaw = Math.atan2(matrix[2], matrix[10]);
  const pitch = Math.asin(-matrix[6]);
  return { yaw: (yaw * 180) / Math.PI, pitch: (pitch * 180) / Math.PI };
}

function pushHeadPose(runtime, pose) {
  pushTimedValue(runtime.headHist, { t: performance.now(), ...pose }, 1200);
}

function recentChangeDeg(runtime, key) {
  if (runtime.headHist.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < runtime.headHist.length; index += 1) {
    total += Math.abs(
      runtime.headHist[index][key] - runtime.headHist[index - 1][key],
    );
  }
  return total;
}

function updateBlinkRate(runtime, blend) {
  const closed = (bs(blend, "eyeBlinkLeft") + bs(blend, "eyeBlinkRight")) / 2;
  const now = performance.now();
  if (runtime.prevBlink < 0.5 && closed > 0.8) runtime.blinkTimes.push(now);
  while (runtime.blinkTimes.length && now - runtime.blinkTimes[0] > 30000) {
    runtime.blinkTimes.shift();
  }
  runtime.prevBlink = closed;
  return runtime.blinkTimes.length * 2;
}

function isValidHand(lms) {
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

function fingerCurled(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) return 0;
  return dist(lms[tip], lms[mcp]) < dist(lms[pip], lms[mcp]) * 1.05 ? 1 : 0;
}

function fingerExtended(lms, tip, pip, mcp) {
  if (!lms[tip] || !lms[pip] || !lms[mcp]) return 0;
  return dist(lms[tip], lms[mcp]) > dist(lms[pip], lms[mcp]) * 1.1 ? 1 : 0;
}

function thumbGestureScoresFromLandmarks(lms) {
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

function detectThumbs(handResult) {
  let bestUp = 0;
  let bestDown = 0;
  for (const hand of handResult?.landmarks ?? []) {
    const { up, down } = thumbGestureScoresFromLandmarks(hand);
    bestUp = Math.max(bestUp, up);
    bestDown = Math.max(bestDown, down);
  }
  return { up: bestUp, down: bestDown };
}

function raiseHandScoreFromLandmarks(lms) {
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

function detectRaiseHand(handResult) {
  let bestScore = 0;
  for (const hand of handResult?.landmarks ?? []) {
    bestScore = Math.max(bestScore, raiseHandScoreFromLandmarks(hand));
  }
  return bestScore;
}

function exclusiveAgreeDisagree(agreeRaw, disagreeRaw, tUp = 0, tDown = 0) {
  let agree = clamp(agreeRaw);
  let disagree = clamp(disagreeRaw);
  if (tUp >= 0.75 && tUp - disagree >= 0.05) disagree = 0;
  if (tDown >= 0.65 && tDown - agree >= 0.05) agree = 0;
  const strongest = Math.max(agree, disagree);
  if (strongest > 0.45 && Math.abs(agree - disagree) > 0.06) {
    if (agree > disagree) disagree = 0;
    else agree = 0;
  } else {
    const sum = agree + disagree + 1e-6;
    agree = (agree / sum) * Math.min(sum, 0.35);
    disagree = (disagree / sum) * Math.min(sum, 0.35);
  }
  return { agree: clamp(agree), disagree: clamp(disagree) };
}

function exclusiveHandGestures(raiseHandRaw, thumbUpRaw, thumbDownRaw) {
  let raiseHand = clamp(raiseHandRaw);
  let thumbUp = clamp(thumbUpRaw);
  let thumbDown = clamp(thumbDownRaw);
  const max = Math.max(raiseHand, thumbUp, thumbDown);
  if (max > 0.6) {
    if (
      raiseHand === max &&
      raiseHand - thumbUp > 0.15 &&
      raiseHand - thumbDown > 0.15
    ) {
      thumbUp = 0;
      thumbDown = 0;
    } else if (
      thumbUp === max &&
      thumbUp - raiseHand > 0.15 &&
      thumbUp - thumbDown > 0.15
    ) {
      raiseHand = 0;
      thumbDown = 0;
    } else if (
      thumbDown === max &&
      thumbDown - raiseHand > 0.15 &&
      thumbDown - thumbUp > 0.15
    ) {
      raiseHand = 0;
      thumbUp = 0;
    } else {
      const sum = raiseHand + thumbUp + thumbDown + 1e-6;
      raiseHand = (raiseHand / sum) * Math.min(sum, 0.4);
      thumbUp = (thumbUp / sum) * Math.min(sum, 0.4);
      thumbDown = (thumbDown / sum) * Math.min(sum, 0.4);
    }
  }
  return {
    raiseHand: clamp(raiseHand),
    thumbUp: clamp(thumbUp),
    thumbDown: clamp(thumbDown),
  };
}

function exclusiveThinkingBored(thinkingRaw, boredRaw) {
  let thinking = clamp(thinkingRaw);
  let bored = clamp(boredRaw);
  if (Math.max(thinking, bored) > 0.15) {
    if (thinking > bored) bored = 0;
    else thinking = 0;
  } else {
    const sum = thinking + bored + 1e-6;
    const cap = 0.5;
    thinking = (thinking / sum) * Math.min(sum, cap);
    bored = (bored / sum) * Math.min(sum, cap);
  }
  return { thinking: clamp(thinking), bored: clamp(bored) };
}

function minHandDistanceToPoint(hands, point) {
  if (!hands) return 1;
  let best = 1;
  for (const hand of hands) {
    if (!isValidHand(hand)) continue;
    for (const p of hand) best = Math.min(best, dist(p, point));
  }
  return best;
}

function learnerStatesFromSignals(
  runtime,
  blend,
  attn,
  headPoseAvailable,
  faceLM = null,
  handsLM = null,
) {
  const get = (name) => bs(blend, name);
  const blinkRate = updateBlinkRate(runtime, blend);
  const gazeHoriz =
    (get("eyeLookInLeft") +
      get("eyeLookOutLeft") +
      get("eyeLookInRight") +
      get("eyeLookOutRight")) /
    4;
  const gazeVert =
    (get("eyeLookUpLeft") +
      get("eyeLookUpRight") +
      get("eyeLookDownLeft") +
      get("eyeLookDownRight")) /
    4;
  const gazeAway = clamp((Math.max(gazeHoriz, gazeVert) - 0.15) / 0.85);
  pushTimedValue(runtime.gazeHist, { t: performance.now(), v: gazeAway }, 1500);
  const gazeVar = recentVariance(runtime.gazeHist);
  const eyesOpen = 1 - (get("eyeBlinkLeft") + get("eyeBlinkRight")) / 2;
  const furrow = clamp((get("browDownLeft") + get("browDownRight")) / 2);
  const innerRaise = clamp(get("browInnerUp"));
  const asymBrows = clamp(
    0.5 *
      (Math.abs(get("browOuterUpLeft") - get("browOuterUpRight")) +
        Math.abs(get("browDownLeft") - get("browDownRight"))),
  );
  const squint = clamp((get("eyeSquintLeft") + get("eyeSquintRight")) / 2);
  const jawOpen = clamp(get("jawOpen"));
  const mildParted = clamp(
    ((jawOpen - 0.12) / 0.25) * (1 - clamp((jawOpen - 0.5) / 0.4)),
  );
  const mouthDown = clamp((get("mouthFrownLeft") + get("mouthFrownRight")) / 2);
  const headTiltScore = clamp(
    Math.max(0, Math.abs(headTiltDegFromEyes(faceLM || [])) - 3) / 22,
  );
  const handToChin = clamp(
    (0.12 - minHandDistanceToPoint(handsLM, chinPoint(faceLM || []))) / 0.12,
  );
  const confusionCore = clamp(
    0.22 * furrow +
      0.18 * innerRaise +
      0.18 * asymBrows +
      0.18 * squint +
      0.1 * mildParted +
      0.08 * mouthDown +
      0.1 * headTiltScore +
      0.08 * handToChin,
  );
  const nodScore = headPoseAvailable
    ? clamp(recentChangeDeg(runtime, "pitch") / 90)
    : 0;
  const shakeScore = headPoseAvailable
    ? clamp(recentChangeDeg(runtime, "yaw") / 90)
    : 0;
  const droop = clamp((1 - eyesOpen - 0.35) / 0.35);
  const yawn = clamp(get("jawOpen"));
  const frown = clamp((get("mouthFrownLeft") + get("mouthFrownRight")) / 2);
  const press = clamp((get("mouthPressLeft") + get("mouthPressRight")) / 2);
  const eyeRoll = clamp(
    (get("eyeLookUpLeft") + get("eyeLookUpRight")) / 2 - 0.3,
  );
  const mouth = mouthCenter(faceLM || []);
  const cheeks = cheekPoints(faceLM || []);
  const coverMouth = clamp(
    (0.1 - minHandDistanceToPoint(handsLM, mouth)) / 0.1,
  );
  const headRest = clamp(
    (0.12 -
      Math.min(
        minHandDistanceToPoint(handsLM, cheeks[0]),
        minHandDistanceToPoint(handsLM, cheeks[1]),
      )) /
      0.12,
  );
  const avoidEye = clamp((Math.max(gazeHoriz, gazeVert) - 0.15) / 0.85);
  const flatStare =
    clamp((0.008 - gazeVar) / 0.008) * clamp((8 - blinkRate) / 8);
  const lowAttnPenalty = clamp((1 - attn - 0.35) / 0.5);
  const boredComposite = clamp(
    0.18 * lowAttnPenalty +
      0.24 * avoidEye +
      0.2 * flatStare +
      0.14 * droop +
      0.16 * yawn +
      0.12 * Math.max(frown, press) +
      0.08 * coverMouth +
      0.06 * headRest +
      0.06 * eyeRoll,
  );
  const angerProto = clamp(
    0.45 * press +
      0.3 * ((get("browDownLeft") + get("browDownRight")) / 2) +
      0.25 * ((get("noseSneerLeft") + get("noseSneerRight")) / 2),
  );
  const confusion = clamp(
    confusionCore * (1 - 0.3 * angerProto) * (1 - 0.35 * boredComposite),
  );
  const thinking = clamp(
    0.5 * attn +
      0.2 * (1 - avoidEye) +
      0.15 * press +
      0.1 * handToChin +
      0.05 * headTiltScore,
  );
  const surprised = clamp(
    get("jawOpen") + 0.5 * ((get("eyeWideLeft") + get("eyeWideRight")) / 2),
  );
  const tb = exclusiveThinkingBored(thinking, boredComposite);
  const scores = {
    Agreeing: nodScore,
    Disagreeing: shakeScore,
    Confused: confusion,
    Thinking: tb.thinking,
    Bored: tb.bored,
    Surprised: surprised,
  };
  scores.Neutral = clamp(1 - Math.max(0, ...Object.values(scores)) * 0.8);
  return scores;
}

function drawSparkline(ctx, buffer, canvas, value) {
  buffer.push(value);
  buffer.shift();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  for (let index = 0; index < buffer.length; index += 1) {
    const x = (index / (buffer.length - 1)) * canvas.width;
    const y = canvas.height - buffer[index] * canvas.height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#38bdf8";
  ctx.stroke();
}

function drawFace(ctx, canvas, landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(56,189,248,0.4)";
  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const keyPoints = [
    { idx: 33, color: "rgba(56,189,248,1)", size: 3 },
    { idx: 133, color: "rgba(56,189,248,1)", size: 3 },
    { idx: 362, color: "rgba(56,189,248,1)", size: 3 },
    { idx: 263, color: "rgba(56,189,248,1)", size: 3 },
    { idx: 468, color: "rgba(255,215,0,0.9)", size: 4 },
    { idx: 473, color: "rgba(255,215,0,0.9)", size: 4 },
    { idx: 70, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 63, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 105, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 66, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 300, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 293, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 334, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 296, color: "rgba(34,197,94,0.9)", size: 2.5 },
    { idx: 1, color: "rgba(245,158,11,0.9)", size: 3 },
    { idx: 4, color: "rgba(245,158,11,0.8)", size: 2 },
    { idx: 5, color: "rgba(245,158,11,0.8)", size: 2 },
    { idx: 195, color: "rgba(245,158,11,0.8)", size: 2 },
    { idx: 61, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 291, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 0, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 17, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 78, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 308, color: "rgba(239,68,68,0.9)", size: 2.5 },
    { idx: 10, color: "rgba(168,85,247,0.8)", size: 2 },
    { idx: 152, color: "rgba(168,85,247,0.9)", size: 3 },
    { idx: 234, color: "rgba(168,85,247,0.8)", size: 2 },
    { idx: 454, color: "rgba(168,85,247,0.8)", size: 2 },
  ];

  for (const keyPoint of keyPoints) {
    const point = landmarks[keyPoint.idx];
    if (!point) continue;
    ctx.fillStyle = keyPoint.color;
    ctx.beginPath();
    ctx.arc(
      point.x * canvas.width,
      point.y * canvas.height,
      keyPoint.size,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const faceOval = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ];
  ctx.strokeStyle = "rgba(168,85,247,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let index = 0; index < faceOval.length; index += 1) {
    const point = landmarks[faceOval[index]];
    if (!point) continue;
    if (index === 0)
      ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
    else ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawHands(ctx, canvas, hands) {
  if (!hands?.length) return;
  ctx.save();
  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [5, 9],
    [9, 13],
    [13, 17],
  ];

  for (const hand of hands) {
    if (!isValidHand(hand)) continue;

    ctx.strokeStyle = "rgba(34,197,94,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [start, end] of connections) {
      if (!hand[start] || !hand[end]) continue;
      ctx.moveTo(hand[start].x * canvas.width, hand[start].y * canvas.height);
      ctx.lineTo(hand[end].x * canvas.width, hand[end].y * canvas.height);
    }
    ctx.stroke();

    for (let index = 0; index < hand.length; index += 1) {
      const point = hand[index];
      if (!point) continue;
      ctx.beginPath();
      if (index === 0) {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          4,
          0,
          Math.PI * 2,
        );
      } else if (index >= 1 && index <= 4) {
        ctx.fillStyle = "rgba(250,204,21,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          index === 4 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
      } else if (index >= 5 && index <= 8) {
        ctx.fillStyle = "rgba(34,211,238,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          index === 8 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
      } else if (index >= 9 && index <= 12) {
        ctx.fillStyle = "rgba(34,197,94,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          index === 12 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
      } else if (index >= 13 && index <= 16) {
        ctx.fillStyle = "rgba(168,85,247,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          index === 16 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
      } else {
        ctx.fillStyle = "rgba(236,72,153,0.9)";
        ctx.arc(
          point.x * canvas.width,
          point.y * canvas.height,
          index === 20 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

function needSecureOrigin() {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return !(window.location.protocol === "https:" || isLocal);
}

export default function StudentAttentionMonitor() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const newCanvas = useRef(null);
  const sparkRef = useRef(null);
  const frameRef = useRef(0);
  const streamRef = useRef(null);
  const badLightiningRef = useRef(null);
  const unevenLightingRef = useRef(null);
  const faceDistRef = useRef(null);
  const facePostRef = useRef(null);
  const runningRef = useRef(false);
  const overlayVisibleRef = useRef(true);
  const modelsRef = useRef({ faceLandmarker: null, handLandmarker: null });
  const runtimeRef = useRef(createRuntimeState());
  const [ui, setUi] = useState(INITIAL_UI);
  const [overlayVisible, setOverlayVisible] = useState(true);

  overlayVisibleRef.current = overlayVisible;

  function stopStream() {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function showError(message) {
    setUi((current) => ({
      ...current,
      hasError: true,
      notice: `Error: ${message}`,
    }));
  }

  async function ensureModels() {
    if (modelsRef.current.faceLandmarker && modelsRef.current.handLandmarker)
      return modelsRef.current;
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    const faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });
    modelsRef.current = { faceLandmarker, handLandmarker };
    return modelsRef.current;
  }

  function updateUi(attention, learner) {
    const runtime = runtimeRef.current;
    const sparkCanvas = sparkRef.current;
    const sparkCtx = sparkCanvas?.getContext("2d");
    if (sparkCanvas && sparkCtx)
      drawSparkline(sparkCtx, runtime.sparkBuf, sparkCanvas, attention);
    const agreeRaw = Math.max(learner.Agreeing || 0, runtime.thumbUpLevel);
    const disagreeRaw = Math.max(
      learner.Disagreeing || 0,
      runtime.thumbDownLevel,
    );
    const exclusive = exclusiveAgreeDisagree(
      agreeRaw,
      disagreeRaw,
      runtime.thumbUpLevel,
      runtime.thumbDownLevel,
    );
    const nextLearner = {
      ...INITIAL_LEARNER,
      ...learner,
      Agreeing: exclusive.agree,
      Disagreeing: exclusive.disagree,
    };
    const topEmotion =
      Object.entries(nextLearner).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Neutral";
    setUi((current) => ({
      ...current,
      attention,
      topEmotion,
      learner: nextLearner,
      gestureLevels: {
        raiseHand: runtime.raiseHandLevel,
        agree: runtime.thumbUpLevel,
        disagree: runtime.thumbDownLevel,
      },
      gestureCounts: {
        raiseHand: runtime.raiseHandCount,
        agree: runtime.thumbUpCount,
        disagree: runtime.thumbDownCount,
      },
    }));
  }

  function updateFps() {
    const runtime = runtimeRef.current;
    runtime.frames += 1;
    const now = performance.now();
    if (now - runtime.lastFpsUpdate > 500) {
      const fps = (runtime.frames * 1000) / (now - runtime.lastFpsUpdate);
      runtime.frames = 0;
      runtime.lastFpsUpdate = now;
      setUi((current) => ({ ...current, fps: `fps: ${fps.toFixed(1)}` }));
    }
  }

  function getBrightness(ImageData) {
    const data = ImageData.data;
    let total = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    return total / pixels;
  }

  // function evaluateBrightness(brightness){

  // if (brightness < 50) {
  //     return { ok: false, message: "Too dark" };
  //   } else if (brightness > 200) {
  //     return { ok: false, message: "Too bright" };
  //   } else {
  //     return { ok: true, message: "Lighting good" };
  //   }
  // }

  async function loop() {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    const { faceLandmarker, handLandmarker } = modelsRef.current;
    if (
      !video ||
      !overlay ||
      !faceLandmarker ||
      !handLandmarker ||
      video.readyState < 2
    ) {
      frameRef.current = requestAnimationFrame(loop);
      return;
    }
    const processCanvas = newCanvas.current;
    const pctx = processCanvas.getContext("2d");
    processCanvas.width = video.videoWidth;
    processCanvas.height = video.videoHeight;

    const ctx = overlay.getContext("2d");
    const ts = performance.now();
    const face = faceLandmarker.detectForVideo(video, ts);
    const hands = handLandmarker.detectForVideo(video, ts);
    if (face?.faceLandmarks?.length) {
      console.log("Faces detected:", face.faceLandmarks.length);
      console.log("Number of landmarks:", face.faceLandmarks[0].length);
      console.log("Sample landmark:", face.faceLandmarks[0][0]);

      const landmarks = face.faceLandmarks[0];
      const canvasWidth = processCanvas.width;
      const canvasHeight = processCanvas.height;

      //uneven lightening

      const [leftCheek, rightCheek] = cheekPoints(landmarks);
      console.log("Left Cheek:", leftCheek);
      console.log("Right Cheek:", rightCheek);
      const leftX = Math.floor(leftCheek.x * canvasWidth);
      const leftY = Math.floor(leftCheek.y * canvasHeight);

      const rightX = Math.floor(rightCheek.x * canvasWidth);
      const rightY = Math.floor(rightCheek.y * canvasHeight);

      console.log("Left cheek pixel:", leftX, leftY);
      console.log("Right cheek pixel:", rightX, rightY);

      const boxSize = 35;
      const halfBox = Math.floor(boxSize / 2);

      const leftBoxX = leftX - halfBox;
      const leftBoxY = leftY - halfBox;
      const rightBoxX = rightX - halfBox;
      const rightBoxY = rightY - halfBox;
      console.log("Left box:", leftBoxX, leftBoxY);
      console.log("Right box:", rightBoxX, rightBoxY);

      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;

      for (const point of landmarks) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      }

      console.log("Bounding Box:", minX, maxX, minY, maxY);


      const x1 = Math.floor(minX * canvasWidth);
      const x2 = Math.floor(maxX * canvasWidth);

      const y1 = Math.floor(minY * canvasHeight);
      const y2 = Math.floor(maxY * canvasHeight);
      console.log("pixel box: ", x1, x2, y1, y2);

      const faceWidth = x2 - x1;
      const faceHeight = y2 - y1;

      pctx.drawImage(video, 0, 0, processCanvas.width, processCanvas.height);

      const leftCheekRegion = pctx.getImageData(
        leftBoxX,
        leftBoxY,
        boxSize,
        boxSize,
      );
      const rightCheekRegion = pctx.getImageData(
        rightBoxX,
        rightBoxY,
        boxSize,
        boxSize,
      );
      console.log("Left cheek region:", leftCheekRegion);
      console.log("Right cheek region:", rightCheekRegion);
      const leftBrightness = getBrightness(leftCheekRegion);
      const rightBrightness = getBrightness(rightCheekRegion);
      console.log("Left Cheek Brightness:", leftBrightness);
      console.log("Right Cheek Brightness:", rightBrightness);

      const lightingDifference = Math.abs(leftBrightness - rightBrightness);

      console.log("Lighting Difference:", lightingDifference);
      let showUnevenLightingPopup = false;
      let unevenLightingStatus = "";
      let unevenLightingSuggestion = "";
      if (lightingDifference > 70) {
        if (!unevenLightingRef.current) {
          unevenLightingRef.current = performance.now();
        }
        const unevenDuration = performance.now() - unevenLightingRef.current;
        if (unevenDuration > 3000) {
          showUnevenLightingPopup = true;
          unevenLightingStatus = "Uneven Lighting Detected ⚠️";
          unevenLightingSuggestion =
            "Try to have more balanced lighting on both sides of your face";
        }

        console.log("⚠️ Uneven Lighting Detected");
      } else {
        unevenLightingRef.current = null;
        ((showUnevenLightingPopup = false),
          (unevenLightingStatus = "Lighting balanced"));
        unevenLightingSuggestion = "";

        console.log("✅ Balanced Lighting");
      }

      //  brightness detection
      const faceRegion = pctx.getImageData(x1, y1, faceWidth, faceHeight);

      const brightness = getBrightness(faceRegion);
      console.log("Brightness:", brightness);
      let lightingStatus = "";
      let lightingSuggestion = "";
      let showLightingpopup = false;

      if (brightness < 40) {
        lightingStatus = "Too Dark ❌";
        lightingSuggestion = "Move closer to a light source";

        if (!badLightiningRef.current) {
          badLightiningRef.current = performance.now();
        }
        const badDuration = performance.now() - badLightiningRef.current;
        if (badDuration > 3000) {
          showLightingpopup = true;
        }
      } else if (brightness > 200) {
        const badDuration = performance.now() - badLightiningRef.current;
        lightingStatus = "Too Bright ⚠️";
        lightingSuggestion =
          "Reduce direct light or move away from strong light";

        if (!badLightiningRef.current) {
          badLightiningRef.current = performance.now();
        }
        if (badDuration > 3000) {
          showLightingpopup = true;
        }
      } else {
        lightingStatus = "Lighting Good ✅";
        lightingSuggestion = "Lighting is suitable for video capture";
        badLightiningRef.current = null;
        showLightingpopup = false;
      }
      //Face Size / Distance Check
      const FaceWIdth = maxX - minX;
      const FaceHeight = maxY - minY;
      const FaceArea = FaceWIdth * FaceHeight;
      let faceDistanceStatus = "";
      let faceDistanceSuggestion = "";
      let showFaceDistancePopup = false;

      if (FaceArea < 0.02) {
        console.log("Too Far from the camera");
        faceDistanceStatus = "Too Far ❌";
        faceDistanceSuggestion = "Move closer to the camera";
        if (!faceDistRef.current) {
          faceDistRef.current = performance.now();
        }
        const badDistance = performance.now() - faceDistRef.current;
        if (badDistance > 3000) {
          showFaceDistancePopup = true;
        }
      } else if (FaceArea > 0.55) {
        console.log("Too Close to the camera");
        faceDistanceStatus = "Too Close ⚠️";
        faceDistanceSuggestion = "Move slightly back";
        if (!faceDistRef.current) {
          faceDistRef.current = performance.now();
        }

        const badDistance = performance.now() - faceDistRef.current;
        if (badDistance > 3000) {
          showFaceDistancePopup = true;
        }
      } else {
        faceDistanceStatus = "Good Distance ✅";
        faceDistanceSuggestion = "Face distance is ideal";
        showFaceDistancePopup = false;
        faceDistRef.current = null;
      }

      //faceposition Check
      
      const faceCenterX = (minX + maxX) / 2;
      const faceCenterY = (minY + maxY) / 2;
      let facePositionStatus = "";
      let facePositionSuggestion = "";
      let showFacePositionPopup = false;

      if (  faceCenterX < 0.4) {
        facePositionStatus = "Face Left Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";
        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterX > 0.6) {
        facePositionStatus = "Face Right Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";
        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterY < 0.4) {
        facePositionStatus = "Face Top Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";

        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else if (faceCenterY > 0.6) {
        facePositionStatus = "Face Bottom Aligned ⚠️";
        facePositionSuggestion = "Please center your face in the frame";

        if (!facePostRef.current) {
          facePostRef.current = performance.now();
        } else {
          const badPosition = performance.now() - facePostRef.current;
          if (badPosition > 3000) {
            showFacePositionPopup = true;
          }
        }
      } else {
        facePositionStatus = "Face Centered ✅";
        facePositionSuggestion = "Face position is good";
        showFacePositionPopup = false;
        facePostRef.current = null;
      }

      if (overlayVisibleRef.current) {
        drawFace(ctx, overlay, face.faceLandmarks[0]);
        drawHands(ctx, overlay, hands?.landmarks);
      } else {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
      let headPoseAvailable = false;
      let yawDeg = 0;
      let pitchDeg = 0;
      if (face.facialTransformationMatrixes?.length) {
        const pose = forwardYawPitchFromMatrix(
          face.facialTransformationMatrixes[0].data,
        );
        if (pose) {
          pushHeadPose(runtimeRef.current, pose);
          headPoseAvailable = true;
          yawDeg = pose.yaw;
          pitchDeg = pose.pitch;
        }
      }
      setUi((current) => ({
        ...current,
        brightness: Math.round(brightness),
        lightingStatus: lightingStatus,
        lightingSuggestion: lightingSuggestion,
        showLightingPopup: showLightingpopup,
        unevenLightingStatus: unevenLightingStatus,
        unevenLightingSuggestion: unevenLightingSuggestion,
        showUnevenLightingPopup: showUnevenLightingPopup,
        faceDistanceStatus: faceDistanceStatus,
        faceDistanceSuggestion: faceDistanceSuggestion,
        showFaceDistancePopup: showFaceDistancePopup,
        facePositionstatus: facePositionStatus,
        facePositionSuggestion: facePositionSuggestion,
        showFacePositionPopup: showFacePositionPopup




      }));
      if (
        showLightingpopup ||
        showUnevenLightingPopup ||
        showFaceDistancePopup
      ) {
        updateFps();
        frameRef.current = requestAnimationFrame(loop);
        return;
      }
      const runtime = runtimeRef.current;
      const { up, down } = detectThumbs(hands);
      const raiseHandRaw = detectRaiseHand(hands);
      const exclusive = exclusiveHandGestures(
        runtime.emaRaiseHand(raiseHandRaw),
        runtime.emaUp(up),
        runtime.emaDown(down),
      );
      runtime.raiseHandLevel = exclusive.raiseHand;
      runtime.thumbUpLevel = exclusive.thumbUp;
      runtime.thumbDownLevel = exclusive.thumbDown;
      const upActive = runtime.thumbUpLevel >= 0.85;
      const downActive = runtime.thumbDownLevel >= 0.75;
      const raiseActive = runtime.raiseHandLevel >= 0.7;
      if (upActive && !runtime.prevUpActive) runtime.thumbUpCount += 1;
      if (downActive && !runtime.prevDownActive) runtime.thumbDownCount += 1;
      if (raiseActive && !runtime.prevRaiseHandActive)
        runtime.raiseHandCount += 1;
      runtime.prevUpActive = upActive;
      runtime.prevDownActive = downActive;
      runtime.prevRaiseHandActive = raiseActive;
      const attnRaw = computeAttention(face.faceBlendshapes, yawDeg, pitchDeg);
      pushAttention(runtime, attnRaw);
      const attn = runtime.attnEMA(getAggregatedAttention(runtime, attnRaw));
      const learnerRaw = learnerStatesFromSignals(
        runtime,
        face.faceBlendshapes,
        attn,
        headPoseAvailable,
        face.faceLandmarks[0],
        hands?.landmarks,
      );
      learnerRaw.RaiseHand = runtime.raiseHandLevel;
      pushLearnerStates(runtime, learnerRaw);
      updateUi(attn, getAggregatedLearnerStates(runtime));
    } else {
      const ctx2 = overlay.getContext("2d");
      ctx2.clearRect(0, 0, overlay.width, overlay.height);
      updateUi(runtimeRef.current.attnEMA(0), INITIAL_LEARNER);
    }

    updateFps();
    if (runningRef.current) frameRef.current = requestAnimationFrame(loop);
  }

  async function start() {
    if (needSecureOrigin()) {
      showError("Camera access requires HTTPS or localhost.");
      return;
    }
    newCanvas.current = document.createElement("canvas");
    try {
      stopStream();
      runtimeRef.current = createRuntimeState();
      setUi(INITIAL_UI);
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay) return;
      await ensureModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 300));
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      runningRef.current = true;
      frameRef.current = requestAnimationFrame(loop);
    } catch (error) {
      stopStream();
      showError(
        error instanceof Error ? error.message : "Failed to start camera.",
      );
    }
  }

  function stop() {
    stopStream();
  }

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const attentionPct = `${Math.round(ui.attention * 100)}%`;

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Student Attention & Emotion Monitor</h1>
        <div className="row">
          <button className="btn primary" onClick={start}>
            Start camera
          </button>
          <button className="btn" onClick={stop}>
            Stop
          </button>
          <button
            className="btn"
            onClick={() => setOverlayVisible((value) => !value)}
          >
            Toggle overlay
          </button>
        </div>
      </header>

      <main className="app">
        <section className="card videoWrap">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas
            ref={overlayRef}
            className={`overlay${overlayVisible ? "" : " hidden"}`}
          />

          {ui.showLightingPopup && (
            <div className="lightingPopup">
              <h2>Poor Lighting Detected</h2>
              <p>Your face is not clearly visible for reliable analysis.</p>

              <p>
                Please move closer to a light source or reduce strong direct
                light.
              </p>

              <p>Waiting for better lighting...</p>
            </div>
          )}
          {ui.showUnevenLightingPopup && (
            <div className="lightingPopup">
              <h2>Uneven Lighting Detected</h2>
              <p>One side of your face is brighter than the other.</p>
              <p>Please sit facing the light source evenly.</p>
              <p>Waiting for balanced lighting...</p>
            </div>
          )}

          {ui.showFaceDistancePopup && (
            <div className="lightingPopup">
              <h1>Face Distance Issue Detected </h1>
              {ui.faceDistanceStatus === "Too Far ❌" ? (
                <p>
                  Your face appears too small, indicating you are too far from
                  the camera.
                </p>
              ) : (
                <p>
                  Your face appears too large, indicating you are too close to
                  the camera.
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="card pane">
          <div className="kv">
            <div className="badge">Attention score</div>
            <div className="attnPct">{attentionPct}</div>
          </div>
          <div className="meter" aria-label="Attention meter">
            <i style={{ width: attentionPct }} />
          </div>
          <div className="kv">
            <span className="muted">Current state</span>
            <b>{ui.topEmotion}</b>
          </div>
          <h3>Video Quality</h3>

          <div className="kv">
            <span className="muted">Lighting Status</span>
            <b>{ui.lightingStatus}</b>
          </div>

          <div className="kv">
            <span className="muted">Face Brightness</span>
            <b>{ui.brightness}</b>
          </div>

          <div className="kv">
            <span className="muted">Suggestion</span>
            <b>{ui.lightingSuggestion}</b>
          </div>

          <div className="kv">
            <span className="muted">Light Balance</span>
            <b>{ui.unevenLightingStatus}</b>
          </div>

          <div className="kv">
            <span className="muted">Balance Suggestion</span>
            <b>{ui.unevenLightingSuggestion}</b>
          </div>

          <div className="kv">
            <span className="muted"> Face distance</span>
            <b>{ui.faceDistanceStatus}</b>
          </div>
          <div className="kv">
            <span className="muted">Position status</span>
            <b>{ui.facePositionStatus}</b>
          </div>














          <h3>Learner states</h3>
          <div className="grid">
            <div>
              <StateRow
                label="Raise hand"
                icon="✋"
                count={ui.gestureCounts.raiseHand}
                level={ui.learner.RaiseHand}
                active={ui.gestureLevels.raiseHand}
              />
              <StateRow
                label="Agreeing"
                icon="👍"
                count={ui.gestureCounts.agree}
                level={ui.learner.Agreeing}
                active={ui.gestureLevels.agree}
              />
              <StateRow
                label="Disagreeing"
                icon="👎"
                count={ui.gestureCounts.disagree}
                level={ui.learner.Disagreeing}
                active={ui.gestureLevels.disagree}
              />
              <StateRow label="Focus" level={ui.learner.Thinking} />
              <StateRow label="Disengaged" level={ui.learner.Bored} />
              <StateRow label="Confused" level={ui.learner.Confused} />
            </div>
          </div>

          <div className="kv statsRow">
            <span className="muted tiny">Last 30s attention</span>
            <span className="muted tiny">{ui.fps}</span>
          </div>
          <canvas ref={sparkRef} className="spark" width="600" height="48" />
          <div className={`notice tiny${ui.hasError ? " error" : ""}`}>
            {ui.notice}
          </div>
        </aside>
      </main>

      <footer>
        <span className="tiny">
          Inference is approximate; use responsibly. This is not a diagnostic or
          proctoring tool.
        </span>
      </footer>
    </div>
  );
}

function StateRow({ label, icon, count, level, active = 0 }) {
  const opacity = active < 0.2 ? 0.25 : active < 0.5 ? 0.6 : 1;
  const activeClass = active >= 0.7 ? " active" : "";
  return (
    <div className="emo">
      <b>{label}</b>
      {icon ? (
        <>
          <span
            className={`icon${activeClass}`}
            style={{ opacity }}
            role="img"
            aria-label={label}
          >
            {icon}
          </span>
          <span className="count">{count ? `x${count}` : ""}</span>
        </>
      ) : null}
      <div className="meter grow">
        <i style={{ width: `${Math.round(level * 100)}%` }} />
      </div>
    </div>
  );
}
