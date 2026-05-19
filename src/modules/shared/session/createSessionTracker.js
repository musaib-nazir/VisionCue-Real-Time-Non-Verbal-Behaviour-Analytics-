const LEARNER_STATES = [
  "RaiseHand",
  "Agreeing",
  "Disagreeing",
  "Thinking",
  "Bored",
  "Confused",
  "Surprised",
  "Neutral",
];

const QUALITY_ISSUES = [
  "poorLighting",
  "blur",
  "faceDistance",
  "occlusion",
  "multipleFaces",
];

function emptyCounts(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function createRecommendations(report) {
  const recommendations = [];

  if (report.averageAttention !== null && report.averageAttention < 0.6) {
    recommendations.push("Review moments where attention dropped.");
  }

  if (report.qualityIssues.poorLighting > 0) {
    recommendations.push("Improve lighting before the next session.");
  }

  if (report.qualityIssues.blur > 0) {
    recommendations.push("Keep the camera steady and check focus.");
  }

  if (report.qualityIssues.faceDistance > 0) {
    recommendations.push("Maintain a consistent distance from the camera.");
  }

  if (report.qualityIssues.occlusion > 0) {
    recommendations.push("Keep the full face visible during analysis.");
  }

  if (report.qualityIssues.multipleFaces > 0) {
    recommendations.push("Keep only one person in the camera frame.");
  }

  if (!recommendations.length) {
    recommendations.push("Session quality looked good.");
  }

  return recommendations;
}

export function createSessionTracker() {
  let startedAt = null;
  let lastSampleAt = null;
  let active = false;
  let frameCount = 0;
  let attentionFrames = 0;
  let attentionSum = 0;
  let minAttention = 1;
  let maxAttention = 0;
  let blockedMs = 0;
  let latestGestureCounts = { raiseHand: 0, agree: 0, disagree: 0 };
  let learnerTotals = emptyCounts(LEARNER_STATES);
  let qualityIssues = emptyCounts(QUALITY_ISSUES);

  function reset(now = Date.now()) {
    startedAt = now;
    lastSampleAt = performance.now();
    active = true;
    frameCount = 0;
    attentionFrames = 0;
    attentionSum = 0;
    minAttention = 1;
    maxAttention = 0;
    blockedMs = 0;
    latestGestureCounts = { raiseHand: 0, agree: 0, disagree: 0 };
    learnerTotals = emptyCounts(LEARNER_STATES);
    qualityIssues = emptyCounts(QUALITY_ISSUES);
  }

  function recordFrame({
    attention,
    learner,
    quality,
    gestureCounts,
    qualityIssueFlags,
    sampleAt = performance.now(),
  }) {
    if (!active) return;

    frameCount += 1;

    const deltaMs = Math.max(0, sampleAt - lastSampleAt);
    lastSampleAt = sampleAt;

    if (quality?.shouldBlockAnalysis) {
      blockedMs += deltaMs;
    }

    if (typeof attention === "number" && Number.isFinite(attention)) {
      attentionFrames += 1;
      attentionSum += attention;
      minAttention = Math.min(minAttention, attention);
      maxAttention = Math.max(maxAttention, attention);
    }

    if (learner) {
      for (const key of LEARNER_STATES) {
        learnerTotals[key] += learner[key] || 0;
      }
    }

    if (gestureCounts) {
      latestGestureCounts = { ...latestGestureCounts, ...gestureCounts };
    }

    if (qualityIssueFlags) {
      for (const key of QUALITY_ISSUES) {
        if (qualityIssueFlags[key]) {
          qualityIssues[key] += 1;
        }
      }
    }
  }

  function createReport(now = Date.now()) {
    if (!startedAt) return null;

    const endedAt = now;
    const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
    const averageAttention =
      attentionFrames > 0 ? attentionSum / attentionFrames : null;

    const learnerAverages = Object.fromEntries(
      LEARNER_STATES.map((key) => [
        key,
        frameCount > 0 ? learnerTotals[key] / frameCount : 0,
      ]),
    );

    const topLearnerState =
      Object.entries(learnerAverages).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Neutral";

    const report = {
      startedAt,
      endedAt,
      durationSeconds,
      frameCount,
      averageAttention,
      minAttention: attentionFrames > 0 ? minAttention : null,
      maxAttention: attentionFrames > 0 ? maxAttention : null,
      gestureCounts: latestGestureCounts,
      qualityIssues,
      blockedSeconds: Math.round(blockedMs / 1000),
      topLearnerState,
      learnerAverages,
    };
    active = false;

    return {
      ...report,
      recommendations: createRecommendations(report),
    };
  }

  return {
    reset,
    recordFrame,
    createReport,
  };
}
