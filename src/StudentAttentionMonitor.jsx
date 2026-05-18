import { useEffect, useRef, useState } from "react";
import { checkBrightness } from "./modules/shared/check/brightnesscheck";
import { checkFacePosition } from "./modules/shared/check/facepositioncheck";
import { facedistancecheck } from "./modules/shared/check/facedistancecheck";
import { unevenLightingCheck } from "./modules/shared/check/unevenlightingcheck";
import { occlusionCheck } from "./modules/shared/check/occlusionCheck";
import { blurCheck } from "./modules/shared/check/blurcheck";
import { getMultiFaceMetrics } from "./modules/shared/detection/getMultiFaceMetrics";
import { multiFaceCheck } from "./modules/shared/check/multiFaceCheck";
//imprt detection:
import { getBrightness } from "./modules/shared/detection/getBrightness";

import { getFaceBrightness } from "./modules/shared/detection/getFaceBrightness";
import { getfacebox } from "./modules/shared/detection/getFacebox";
import { getCheekBrightness } from "./modules/shared/detection/getCheekBrightness";
import { getFaceArea } from "./modules/shared/detection/getFaceArea";
import { getFaceCenter } from "./modules/shared/detection/getFaceCenter";
import { getOcclusionMetrics } from "./modules/shared/detection/getOcclusionMetrics";
import { getBlurScore } from "./modules/shared/detection/getBlurScore";

import { videoQualityEngine } from "./modules/shared/Engine/videoQualityEngine";
import { createSessionTracker } from "./modules/shared/session/createSessionTracker";









//studentimnports:
import {
  computeAttention,
  pushAttention,
  getAggregatedAttention,
  pushTimedValue,
  clamp,
  bs,
} from "./modules/student/attentionTracking";

import {
  dist,
  isValidHand,
  fingerCurled,
  fingerExtended,
  thumbGestureScoresFromLandmarks,
  detectThumbs,
  raiseHandScoreFromLandmarks,
  detectRaiseHand,
} from "./modules/student/raiseHandDetection";

import {
  learnerStatesFromSignals,
  pushLearnerStates,
  getAggregatedLearnerStates,
  updateBlinkRate,
  recentVariance,
  headTiltDegFromEyes,
  minHandDistanceToPoint,
  chinPoint,
  mouthCenter,
  cheekPoints,
  recentChangeDeg,
  exclusiveThinkingBored
} from "./modules/student/learnerStateAnalysis";


import { exclusiveAgreeDisagree,exclusiveHandGestures } from "./modules/student/gestureDecision";










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
lightingBalance:"checking lighting balance ",
  facePositionStatus: "Checking Face Position,,,,,",
  facePositionSuggestion:
    "Checking if your face is well positioned in the frame...",
  showFacePositionPopup: false,
occlusionStatus: "Checking occlusion...",
occlusionSuggestion: "Checking if your face is fully visible...",
showOcclusionPopup: false,
  blurScore: 0,
  blurStatus: "Checking focus...",
  blurSuggestion: "Checking if the camera image is sharp...",
  showBlurPopup: false,
    lightingDifferencePercent: 0,
 multiFaceStatus: "Checking for multiple faces...",
    multiFaceSuggestion: "Checking if there are multiple faces in view...",
    showMultiFacePopup: false,
    faceCount:0,
    overallQualityScore: 100,
activePopup: null,

shouldBlockAnalysis: false,

blockingIssues: [],
overallSeverity: "excellent",
  fps: "fps: --",
  learner: INITIAL_LEARNER,
  gestureLevels: { raiseHand: 0, agree: 0, disagree: 0 },
  gestureCounts: { raiseHand: 0, agree: 0, disagree: 0 },
  notice:
    "On-device only. Video never leaves your browser. Works best over HTTPS (or localhost), good lighting, and a single face in view.",
  hasError: false,

};

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
    emaNod: createEMA(0.65),
    emaShake: createEMA(0.65),
    attnEMA: createEMA(0.85),
    thumbUpLevel: 0,
    thumbDownLevel: 0,
    raiseHandLevel: 0,
    nodLevel: 0,
    shakeLevel: 0,
    thumbUpCount: 0,
    thumbDownCount: 0,
    raiseHandCount: 0,
    nodAgreeCount: 0,
    shakeDisagreeCount: 0,
    prevUpActive: false,
    prevDownActive: false,
    prevRaiseHandActive: false,
    prevNodActive: false,
    prevShakeActive: false,
    sparkBuf: new Array(180).fill(0),
    frames: 0,
    lastFpsUpdate: performance.now(),
  };
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
  const occlusionRef = useRef(null);
  const multiFaceRef = useRef(null);
  const blurRef = useRef(null);
const prevFaceAreaRef = useRef(null);
  const overlayVisibleRef = useRef(true);
  const modelsRef = useRef({ faceLandmarker: null, handLandmarker: null });
  const runtimeRef = useRef(createRuntimeState());
  const sessionRef = useRef(createSessionTracker());
  const [ui, setUi] = useState(INITIAL_UI);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [sessionReport, setSessionReport] = useState(null);

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
      numFaces: 5,
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
        agree: Math.max(runtime.thumbUpLevel, runtime.nodLevel),
        disagree: Math.max(runtime.thumbDownLevel, runtime.shakeLevel),
      },
      gestureCounts: {
        raiseHand: runtime.raiseHandCount,
        agree: runtime.thumbUpCount + runtime.nodAgreeCount,
        disagree: runtime.thumbDownCount + runtime.shakeDisagreeCount,
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
    processCanvas.width = 640;
    processCanvas.height = 360;

    const ctx = overlay.getContext("2d");
    const ts = performance.now();
    const face = faceLandmarker.detectForVideo(video, ts);
    const hands = handLandmarker.detectForVideo(video, ts);
    if (face?.faceLandmarks?.length) {
      const landmarks = face.faceLandmarks[0];
      const canvasWidth = processCanvas.width;
      const canvasHeight = processCanvas.height;
      pctx.drawImage(video, 0, 0, processCanvas.width, processCanvas.height);
      //multiple face detection:

      const multiFaceMetrics = getMultiFaceMetrics(
  face.faceLandmarks
);

const {
  multiFaceStatus,
  multiFaceSuggestion,
  showMultiFacePopup,
  faceCount,
} = multiFaceCheck(multiFaceMetrics, multiFaceRef);

      //uneven lightening
      const {
  leftBrightness,
  rightBrightness,
  lightingDifference,
  lightingDifferencePercent,
}=
        getCheekBrightness(
          pctx,
          landmarks,
          canvasWidth,
          canvasHeight,
         
        );

const {
  unevenLightingStatus,
  unevenLightingSuggestion,
  showUnevenLightingPopup,
  severity,
  lightingQualityScore,
} = unevenLightingCheck(
  {
    leftBrightness,
    rightBrightness,
    lightingDifferencePercent,
  },
  unevenLightingRef
);
      //  brightness detection and facebox cal
      const { minX, maxX, minY, maxY, x1, x2, y1, y2, faceWidth, faceHeight } =
        getfacebox(landmarks, canvasWidth, canvasHeight);

      const brightness = getFaceBrightness(pctx, x1, y1, faceWidth, faceHeight);
const {
  lightingStatus,
  lightingSuggestion,
  showLightingPopup,

  brightnessSeverity,

  brightnessQualityScore,

} =
  checkBrightness(
    brightness,
    badLightiningRef
  );
      const blurScore = getBlurScore(pctx, x1, y1, faceWidth, faceHeight);
     const {
  blurStatus,
  blurSuggestion,
  showBlurPopup,

  blurSeverity,
  blurQualityScore,

} = blurCheck(
  blurScore,
  blurRef
);
      //Face Size / Distance Check
      const { FWidth, FHeight, FaceArea } = getFaceArea(minX, maxX, minY, maxY);

const metrics = getOcclusionMetrics({landmarks,hands:hands?.landmarks,  faceBox: { minX, maxX, minY, maxY, FaceArea },  prevFaceArea: prevFaceAreaRef.current,})


prevFaceAreaRef.current = FaceArea;
const {
  occlusionStatus,
  occlusionSuggestion,
  showOcclusionPopup,
 occlusionSeverity,
  occlusionQualityScore,
} = occlusionCheck(metrics, occlusionRef);


      const {
        faceDistanceStatus,
        faceDistanceSuggestion,
        showFaceDistancePopup,
        faceDistanceType,
      } = facedistancecheck(FaceArea, faceDistRef);

      //faceposition Check
      const { faceCenterX, faceCenterY } = getFaceCenter(
        minX,
        maxX,
        minY,
        maxY,
      );


      const {
        facePositionStatus,
        facePositionSuggestion,
        showFacePositionPopup,
      } = checkFacePosition(faceCenterX, faceCenterY, facePostRef);

const quality =
  videoQualityEngine({

    lightingSeverity: severity,

    lightingQualityScore,

    brightnessSeverity,

    brightnessQualityScore,

  occlusionSeverity,

occlusionQualityScore,
    blurSeverity,
blurQualityScore,

    multiFaceDetected:
      faceCount > 1,
      showMultiFacePopup,
      showFaceDistancePopup,
      faceDistanceType,
  });

const qualityIssueFlags = {
  poorLighting:
    severity === "poor" ||
    brightnessSeverity === "poor",
  blur: blurSeverity === "poor",
  faceDistance: showFaceDistancePopup,
  occlusion: occlusionSeverity === "poor",
  multipleFaces: showMultiFacePopup,
};

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
        showLightingPopup: showLightingPopup,
        unevenLightingStatus: unevenLightingStatus,
        unevenLightingSuggestion: unevenLightingSuggestion,
        showUnevenLightingPopup: showUnevenLightingPopup,
        faceDistanceStatus: faceDistanceStatus,
        faceDistanceSuggestion: faceDistanceSuggestion,
        showFaceDistancePopup: showFaceDistancePopup,
        facePositionStatus: facePositionStatus,
        facePositionSuggestion: facePositionSuggestion,
        showFacePositionPopup: showFacePositionPopup,
occlusionStatus: occlusionStatus,
occlusionSuggestion: occlusionSuggestion,
showOcclusionPopup: showOcclusionPopup,
        blurScore: Math.round(blurScore),
        blurStatus: blurStatus,
        blurSuggestion: blurSuggestion,
        showBlurPopup: showBlurPopup,
        lightingBalance:severity,
        lightingDifferencePercent,
         multiFaceStatus: multiFaceStatus,
  multiFaceSuggestion:multiFaceSuggestion,
  showMultiFacePopup: showMultiFacePopup,
  faceCount:faceCount,
  overallQualityScore:
  quality.overallQualityScore,

overallSeverity:
  quality.overallSeverity,
  activePopup:
  quality.activePopup,
  blockingIssues:
  quality.blockingIssues,
  shouldBlockAnalysis:
  quality.shouldBlockAnalysis,
      }));

const shouldBlockAnalysis =
  quality.shouldBlockAnalysis;

if (shouldBlockAnalysis)
{
  sessionRef.current.recordFrame({
    quality,
    qualityIssueFlags,
  });

  updateFps();

  frameRef.current =
    requestAnimationFrame(loop);

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
      runtime.nodLevel = runtime.emaNod(learnerRaw.Agreeing || 0);
      const nodActive = runtime.nodLevel >= 0.45;
      if (nodActive && !runtime.prevNodActive) runtime.nodAgreeCount += 1;
      runtime.prevNodActive = nodActive;
      runtime.shakeLevel = runtime.emaShake(learnerRaw.Disagreeing || 0);
      const shakeActive = runtime.shakeLevel >= 0.45;
      if (shakeActive && !runtime.prevShakeActive)
        runtime.shakeDisagreeCount += 1;
      runtime.prevShakeActive = shakeActive;
      learnerRaw.RaiseHand = runtime.raiseHandLevel;
      pushLearnerStates(runtime, learnerRaw);
      const aggregatedLearner = getAggregatedLearnerStates(runtime);
      updateUi(attn, aggregatedLearner);
      sessionRef.current.recordFrame({
        attention: attn,
        learner: aggregatedLearner,
        quality,
        gestureCounts: {
          raiseHand: runtime.raiseHandCount,
          agree: runtime.thumbUpCount + runtime.nodAgreeCount,
          disagree: runtime.thumbDownCount + runtime.shakeDisagreeCount,
        },
        qualityIssueFlags,
      });
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
      sessionRef.current.reset();
      setSessionReport(null);
      setUi(INITIAL_UI);
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay) return;
      await ensureModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // Also stabilize FPS
    frameRate: { ideal: 30, max: 30 },

    // Better consistency
    aspectRatio: 16 / 9

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
    const report = sessionRef.current.createReport();
    if (report) {
      setSessionReport(report);
    }
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
        <h1>Attention & Emotion Monitor</h1>
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

          {/* {ui.showLightingPopup && (
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
{ui.showOcclusionPopup && (
  <div className="lightingPopup">
    <h2>Face Occlusion Detected</h2>
    <p>Your face is partially blocked.</p>
    <p>{ui.occlusionSuggestion}</p>
    <p>Waiting for a clear view...</p>
  </div>
)}
          {ui.showBlurPopup && (
            <div className="lightingPopup">
              <h2>Blurry Camera Detected</h2>
              <p>Your face is not sharp enough for reliable analysis.</p>
              <p>{ui.blurSuggestion}</p>
              <p>Waiting for a clearer image...</p>
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
          {ui.showMultiFacePopup && (
  <div className="lightingPopup">
    <h2>Multiple Faces Detected</h2>
    <p>{ui.multiFaceSuggestion}</p>
    <p>Only one person should be visible.</p>
  </div>
)} */}
{
  ui.activePopup && (

    <div className="popup-container">

      <div className="popup-box">

        <h2>
          {ui.activePopup.title}
        </h2>

        <div className="popup-content">

          <p className="popup-message">

            {ui.activePopup.message}

          </p>

          <p className="popup-suggestion">

            {ui.activePopup.suggestion}

          </p>

        </div>

      </div>

    </div>
  )
}
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
  <span className="muted">Balance status</span>
  <b>{ui.lightingBalance}</b>
</div>
          <div className="kv">
            <span className="muted">Balance Suggestion</span>
            <b>{ui.unevenLightingSuggestion}</b>
          </div>
          <div className="kv">
  <span className="muted">Balance %</span>
  <b>
  {ui.lightingDifferencePercent?.toFixed(1) || "0.0"}%
</b>
</div>

          <div className="kv">
            <span className="muted"> Face distance</span>
            <b>{ui.faceDistanceStatus}</b>
          </div>
          <div className="kv">
  <span className="muted">Faces</span>
  <b>{ui.multiFaceStatus}</b>
</div>
          <div className="kv">
            <span className="muted">Position status</span>
            <b>{ui.facePositionStatus}</b>
          </div>
<div className="kv">
  <span className="muted">Occlusion</span>
  <b>{ui.occlusionStatus}</b>
</div>
          <div className="kv">
            <span className="muted">Focus</span>
            <b>{ui.blurStatus}</b>
          </div>
          <div className="kv">
            <span className="muted">Sharpness</span>
            <b>{ui.blurScore}</b>
          </div>


<div className="kv">
  <span className="muted">
    Overall Quality
  </span>

  <b>{ui.overallSeverity}</b>
</div>

<div className="kv">
  <span className="muted">
    Quality Score
  </span>

  <b>{ui.overallQualityScore}</b>
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

      {sessionReport && <SessionReport report={sessionReport} />}

      <footer>
        <span className="tiny">
          Inference is approximate; use responsibly. This is not a diagnostic or
          proctoring tool.
        </span>
      </footer>
    </div>
  );
}

function formatPercent(value) {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionReport({ report }) {
  const totalQualityIssues = Object.values(report.qualityIssues).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <section className="card sessionReport">
      <div className="sessionReportHeader">
        <div>
          <h2>Session Report</h2>
          <p className="muted tiny">
            {formatTime(report.startedAt)} - {formatTime(report.endedAt)}
          </p>
        </div>
        <div className="reportScore">
          {formatPercent(report.averageAttention)}
          <span className="muted tiny">avg attention</span>
        </div>
      </div>

      <div className="reportGrid">
        <ReportMetric label="Duration" value={`${report.durationSeconds}s`} />
        <ReportMetric label="Lowest attention" value={formatPercent(report.minAttention)} />
        <ReportMetric label="Highest attention" value={formatPercent(report.maxAttention)} />
        <ReportMetric label="Top state" value={report.topLearnerState} />
        <ReportMetric label="Blocked time" value={`${report.blockedSeconds}s`} />
        <ReportMetric label="Quality issue samples" value={totalQualityIssues} />
      </div>

      <div className="reportColumns">
        <div>
          <h3>Gestures</h3>
          <ReportRow label="Raise hand" value={report.gestureCounts.raiseHand} />
          <ReportRow label="Agreeing" value={report.gestureCounts.agree} />
          <ReportRow label="Disagreeing" value={report.gestureCounts.disagree} />
        </div>

        <div>
          <h3>Quality Issues</h3>
          <ReportRow label="Poor lighting" value={report.qualityIssues.poorLighting} />
          <ReportRow label="Blur" value={report.qualityIssues.blur} />
          <ReportRow label="Face distance" value={report.qualityIssues.faceDistance} />
          <ReportRow label="Occlusion" value={report.qualityIssues.occlusion} />
          <ReportRow label="Multiple faces" value={report.qualityIssues.multipleFaces} />
        </div>

        <div>
          <h3>Recommendations</h3>
          <ul className="reportList">
            {report.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="reportMetric">
      <span className="muted tiny">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="kv reportRow">
      <span className="muted">{label}</span>
      <b>{value}</b>
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
