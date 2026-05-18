import React, { useRef, useEffect, useState } from "react";
import { detectFaceLandmarks } from "../modules/shared/detection/detectFaceLandmarks.js";
import { loadFaceModel } from "../modules/shared/detection/loadFaceModel.js";
import { getfacebox } from "../modules/shared/detection/getFacebox.js";
import { getFaceArea } from "../modules/shared/detection/getFaceArea.js";
import { getFaceBrightness } from "../modules/shared/detection/getFaceBrightness.js";
import { checkBrightness } from "../modules/shared/check/brightnesscheck.js";
import { facedistancecheck } from "../modules/shared/check/facedistancecheck.js";
import { unevenLightingCheck } from "../modules/shared/check/unevenlightingcheck.js";
import { blurCheck } from "../modules/shared/check/blurcheck.js";
import { getCheekBrightness } from "../modules/shared/detection/getCheekBrightness.js";
import { getBlurScore } from "../modules/shared/detection/getBlurScore.js";
import { cheekPoints } from "../modules/student/learnerStateAnalysis.js";

export default function SetupScreen({ onStart }) {
  const vidRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const processCanvasRef = useRef(null);
const badLightingRef = useRef(null);
const faceDistanceRef = useRef(null);
const blurRef = useRef(null);
const [isFaceInsideGuide, setIsFaceInsideGuide] = useState(false);

const unevenLightingRef = useRef(null);

 const [checks, setChecks] = useState([
  {
    id: 1,
    title: "Camera Permission",
    passed: false,
    message: "Please allow camera access",
    required: true,
  },
  {
    id: 2,
    title: "Face Detection",
    passed: false,
    message: "Face not detected,Make sure your face is visible",
    required: true,
  },
  {
    id: 3,
    title: "Proper Lighting",
    passed: false,
    message: "Sit facing a light source",
    required: true,
  },
  {
    id: 4,
    title: "Balanced Lighting",
    passed: false,
    message: "you need to have baancing lighting on both sides of the face ",
    required: true,
  },
  {
    id: 5,
    title: "Correct Distance",
    passed: false,
    message: "Move slightly closer or farther",
    required: true,
  },
  {
    id: 6,
    title: "Face Centered",
    passed: false,
    message: "Align your face in the center",
    required: true,
  },
  {
    id: 7,
    title: "Camera Focus",
    passed: false,
    message: "Keep the camera image sharp",
    required: true,
  },
]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (vidRef.current) {
        vidRef.current.srcObject = stream;
        setChecks((prevChecks) =>
  prevChecks.map((item) =>
    item.id === 1
      ? {
          ...item,
        passed:true,
        }
      : item
  )
);
      }
    } catch {
 setChecks((prevChecks) =>
  prevChecks.map((item) =>
    item.id === 1
      ? {
          ...item,
          passed: false,
          message: "Please allow camera access in browser settings",
        }
      : item
  )
);
}
  }

  ;



const passedChecks = checks.filter((item) => item.passed === true  ).length;
const totalChecks = checks.length;

const readinessScore = Math.round(
  (passedChecks / totalChecks) * 100
);
 

const canStart=checks.filter((item)=>item.required).every((item)=>item.passed===true)

function runFaceCenterCheck(landmarks) {
  const video = vidRef.current;

  if (!video || video.readyState < 2) return;

  const { minX, maxX, minY, maxY } = getfacebox(
    landmarks,
    video.videoWidth,
    video.videoHeight
  );

 
  const guide = {
    minX: 0.3,
    maxX: 0.7,
    minY: 0.2,
    maxY: 0.8,
  };

  const isInside =
    minX > guide.minX &&
    maxX < guide.maxX &&
    minY > guide.minY &&
    maxY < guide.maxY;

  setIsFaceInsideGuide(isInside);

  setChecks(prev =>
    prev.map(item =>
      item.id === 6
        ? {
            ...item,
            passed: isInside,
            message: isInside
              ? "Face positioned well"
              : "Align inside the box",
          }
        : item
    )
  );
}
function runDistanceCheck(landmarks) {


const video = vidRef.current
  if (!video || video.readyState < 2) return;


const { minX, maxX, minY, maxY } = getfacebox(
    landmarks,
    video.videoWidth,
    video.videoHeight
  );
const {FaceArea} = getFaceArea(minX, maxX, minY, maxY,)



const {faceDistanceStatus,
faceDistanceSuggestion,
showFaceDistancePopup} = facedistancecheck(FaceArea,faceDistanceRef);

const isGood = faceDistanceStatus === "Good Distance ✅";

setChecks(prev=>prev.map(item=>
  item.id === 5
    ? { ...item, passed: isGood, message: faceDistanceSuggestion }
    : item
))


}

function runBalancedLightingCheck(landmarks) {

  const video = vidRef.current;
  const canvas = processCanvasRef.current;

  if (!video || !canvas || video.readyState < 2) return;

  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const {
    leftBrightness,
    rightBrightness,
    lightingDifferencePercent,
  } = getCheekBrightness(
    ctx,
    landmarks,
    canvas.width,
    canvas.height,
    cheekPoints
  );

  const {
  unevenLightingStatus,
  unevenLightingSuggestion,
  showUnevenLightingPopup,
  severity,
} = unevenLightingCheck(
  {
    leftBrightness,
    rightBrightness,
    lightingDifferencePercent,
  },
  unevenLightingRef
);

 const isGood = severity !== "poor";
  
  setChecks(prev =>
    prev.map(item =>
      item.id === 4
        ? {
            ...item,
            passed: isGood,
          message: unevenLightingSuggestion,

severity,
          }
        : item
    )
  );
}



























function runFaceCheck() {
  const landmarks = detectFaceLandmarks(
    faceLandmarkerRef.current,
    vidRef.current
  );

  const faceExists = !!landmarks;

  setChecks(prevChecks =>
    prevChecks.map(item =>
      item.id === 2
        ? { ...item, passed: faceExists }
        : item
    )
  );

  return landmarks; 
}
function runLightingCheck(landmarks) {
  const video = vidRef.current;
  const canvas = processCanvasRef.current;

  if (!video || !canvas || video.readyState < 2) return;

  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const { x1, y1, faceWidth, faceHeight } =
    getfacebox(landmarks, canvas.width, canvas.height);
ctx.strokeStyle = "red";
ctx.lineWidth = 2;
ctx.strokeRect(x1, y1, faceWidth, faceHeight);
  const brightness = getFaceBrightness(
    ctx,
    x1,
    y1,
    faceWidth,
    faceHeight
  );

  const { lightingStatus, lightingSuggestion } =
    checkBrightness(brightness, badLightingRef);
 const isGood = lightingStatus === "Lighting Good ✅"

  setChecks(prev =>
    prev.map(item =>
      item.id === 3
        ? { ...item, passed: isGood, message: lightingSuggestion }
        : item
    )
  );
}
function runBlurCheck(landmarks) {
  const video = vidRef.current;
  const canvas = processCanvasRef.current;

  if (!video || !canvas || video.readyState < 2) return;

  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const { x1, y1, faceWidth, faceHeight } = getfacebox(
    landmarks,
    canvas.width,
    canvas.height
  );

  const blurScore = getBlurScore(ctx, x1, y1, faceWidth, faceHeight);
  const { blurStatus, blurSuggestion } = blurCheck(blurScore, blurRef);
  const isSharp = blurStatus === "Image sharp";

  setChecks(prev =>
    prev.map(item =>
      item.id === 7
        ? { ...item, passed: isSharp, message: blurSuggestion }
        : item
    )
  );
}
const priorityOrder = [2, 3, 4, 5, 6, 7];

const failedCheck = priorityOrder
  .map(id => checks.find(c => c.id === id))
  .find(item => item && !item.passed);
useEffect(() => {
  let interval;

  async function setup() {
    await startCamera();

    faceLandmarkerRef.current = await loadFaceModel();

interval = setInterval(() => {
  const landmarks = runFaceCheck(); 

  if (!landmarks) return; 

  runLightingCheck(landmarks);
    runDistanceCheck(landmarks);
    runBalancedLightingCheck(landmarks) 
     runFaceCenterCheck(landmarks);
     runBlurCheck(landmarks);
}, 1000);
  }

  setup();

  return () => {
    clearInterval(interval);
  };
}, []);
  return (
    <div className="setup-screen">
      <h1>Environment Setup Verification</h1>

      <div className="setup-container">
        {/* Left Side - Camera Panel */}
        <div className="camera-panel">
          <div className="camera-header">
            <h2>Live Camera Preview</h2>
          </div>

          <div className="camera-box">

          <div
  className={`face-guide-overlay ${
    isFaceInsideGuide ? "good" : "bad"
  }`}
/>
            <video
              ref={vidRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas
  ref={processCanvasRef}
  style={{ display: "none" }}
/>
{failedCheck && (
  <div className="center-hint">
    {failedCheck.message}
  </div>
)}

           <div
  className={`readiness-badge ${
    readinessScore >= 80
      ? "good"
      : readinessScore >= 50
      ? "medium"
      : "bad"
  }`}
>
  <span>{readinessScore}%</span>
</div>
          </div>
        </div>

        {/* Right Side - Checklist Panel */}
        <div className="checklist-panel">
          <h2>Readiness Checklist</h2>
{checks.map((item) => (
  <div key={item.id} className={`check-item ${
    item.severity ? item.severity : ""
  }`}>

    <div className="check-row">

      <div
        className={`status-box ${
          item.passed === true
            ? "success"
            : item.passed === false
            ? "failed"
            : ""
        }`}
      >
        {item.passed === true
          ? "✓"
          : item.passed === false
          ? "✗"
          : ""}
      </div>

      <div className="check-content">
        <h3>{item.title}</h3>

        <p className="check-message">
          {item.message}
        </p>
      </div>

    </div>

  </div>
))}
        </div>
      </div>

      {/* Start Button */}
   <button
  className="start-btn"
  onClick={onStart}
  disabled={!canStart}
>
{canStart ? "Start Session" : "Complete Setup First"}
</button>
    </div>
  );
}
