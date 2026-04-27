import { clamp, bs, pushTimedValue } from "./attentionTracking";
import { dist } from "./raiseHandDetection";
export function exclusiveThinkingBored(thinkingRaw, boredRaw) {
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

export function learnerStatesFromSignals(
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
export function pushLearnerStates(runtime, states) {
  const t = performance.now();
  for (const [key, value] of Object.entries(states)) {
    const history = runtime.learnerStateHist[key];
    if (!history) continue;
    pushTimedValue(history, { t, score: value }, 5000);
  }
}
export function getAggregatedLearnerStates(runtime) {
  const aggregated = {};
  for (const [key, history] of Object.entries(runtime.learnerStateHist)) {
    aggregated[key] = history.length
      ? history.reduce((sum, item) => sum + item.score, 0) / history.length
      : 0;
  }
  return aggregated;
}
export function updateBlinkRate(runtime, blend) {
  const closed = (bs(blend, "eyeBlinkLeft") + bs(blend, "eyeBlinkRight")) / 2;
  const now = performance.now();
  if (runtime.prevBlink < 0.5 && closed > 0.8) runtime.blinkTimes.push(now);
  while (runtime.blinkTimes.length && now - runtime.blinkTimes[0] > 30000) {
    runtime.blinkTimes.shift();
  }
  runtime.prevBlink = closed;
  return runtime.blinkTimes.length * 2;
}
export function recentVariance(list) {
  if (!list.length) return 0;
  const values = list.map((item) => item.v);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  );
}

export function headTiltDegFromEyes(faceLM) {
  if (!faceLM || faceLM.length < 264) return 0;
  const left = faceLM[33];
  const right = faceLM[263];
  if (!left || !right) return 0;
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
}

export function minHandDistanceToPoint(hands, point) {
  if (!hands) return 1;
  let best = 1;
  for (const hand of hands) {
    if (!isValidHand(hand)) continue;
    for (const p of hand) best = Math.min(best, dist(p, point));
  }
  return best;
}
export function chinPoint(faceLM) {
  if (!faceLM?.length) return { x: 0.5, y: 0.9 };
  return (
    faceLM[152] ||
    faceLM[Math.floor(faceLM.length * 0.95)] || { x: 0.5, y: 0.9 }
  );
}

export function mouthCenter(faceLM) {
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
export function cheekPoints(faceLM) {
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
export function recentChangeDeg(runtime, key) {
  if (runtime.headHist.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < runtime.headHist.length; index += 1) {
    total += Math.abs(
      runtime.headHist[index][key] - runtime.headHist[index - 1][key],
    );
  }
  return total;
}
