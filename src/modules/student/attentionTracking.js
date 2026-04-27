export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
export function bs(blendshapes, name) {
  if (!blendshapes?.length) return 0;
  const categories = blendshapes[0].categories ?? [];
  const match = categories.find((category) => category.categoryName === name);
  return match ? match.score : 0;
}

export function computeAttention(
  blend,
  yawDeg = 0,
  pitchDeg = 0
)  {
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
export function pushTimedValue(list, item, cutoffMs) {
  list.push(item);
  const cutoff = item.t - cutoffMs;
  while (list.length && list[0].t < cutoff) list.shift();
}
export function pushAttention(runtime, score) {
  pushTimedValue(runtime.attnHist, { t: performance.now(), score }, 3000);
}


export function getAggregatedAttention(runtime, currentScore) {
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

export function headOrientationPenalty(yawDeg = 0, pitchDeg = 0) {
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



