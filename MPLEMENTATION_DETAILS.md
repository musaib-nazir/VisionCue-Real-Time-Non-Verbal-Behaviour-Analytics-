# Implementation Details: Body Language Monitor

## Purpose of This Document

This document explains how the repository is implemented at code level. It is meant for an engineer who needs to understand the runtime behavior, important files, algorithms, thresholds, state management, and current technical tradeoffs without stepping through every source file.

Note: the filename is `MPLEMENTATION_DETAILS.md` because that is the exact filename requested.

## Application Entry Flow

The application starts in `src/main.jsx`, which mounts `App.jsx` into the DOM element defined by `index.html`.

```text
index.html
  -> src/main.jsx
    -> src/App.jsx
      -> SetupScreen
      -> ModeSelector
      -> StudentMode or InterviewMode
```

`App.jsx` stores two pieces of top-level state:

- `currentMode`: defaults to `student` and switches between `student` and `interview`.
- `setupComplete`: defaults to `false`; the setup screen must call `onStart` before the monitoring screens appear.

This means the user always sees environment verification before mode selection and monitoring.

## Runtime Dependencies

The project is a Vite React app. The key dependency is `@mediapipe/tasks-vision`, which provides the browser-side ML models.

Important APIs:

- `navigator.mediaDevices.getUserMedia`: opens the webcam.
- `FaceLandmarker`: detects face landmarks, blendshapes, and facial transformation matrices.
- `HandLandmarker`: detects hand landmarks.
- `requestAnimationFrame`: drives the real-time monitoring loop.
- `HTMLCanvasElement.getContext("2d")`: draws video frames, samples pixels, and renders overlays.

## Camera Setup

Camera access is requested in two places:

- `src/components/setupScreen.jsx`
- `src/StudentAttentionMonitor.jsx` and `src/InterviewMonitor.jsx`

The setup screen requests the camera to validate environment conditions before the session. The monitor screens request it again when live analysis starts.

Typical monitor camera constraints:

```js
{
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
    aspectRatio: 16 / 9
  },
  audio: false
}
```

The monitor screens also check for a secure origin. Camera access is allowed on `https`, `localhost`, or `127.0.0.1`.

## Model Loading

### Setup Screen

`loadFaceModel.js` loads only the MediaPipe face model:

- WASM path: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm`
- Model path: Google-hosted `face_landmarker.task`
- Running mode: `VIDEO`
- Faces: `numFaces: 5`

The setup screen does not need the hand model because setup checks use face landmarks and frame pixels only.

### Monitor Screens

`StudentAttentionMonitor.jsx` and `InterviewMonitor.jsx` each define `ensureModels()`. This loads:

- `FaceLandmarker`
- `HandLandmarker`

The face landmarker enables:

- `outputFaceBlendshapes: true`
- `outputFacialTransformationMatrixes: true`
- `numFaces: 5`

The hand landmarker uses:

- `numHands: 2`

The loaded model instances are cached in `modelsRef.current`.

## Main State Containers

The monitors use React state for UI display and refs for mutable runtime state that changes every frame.

### React State

`ui` stores values rendered on screen:

- Attention score
- Current state
- Brightness and blur scores
- Lighting, distance, position, occlusion, and multi-face statuses
- Quality score and severity
- Active popup
- Gesture levels and counts
- FPS
- Error/notice text

`overlayVisible` controls landmark overlay visibility.

Student Mode also stores `sessionReport`.

### Runtime Refs

Refs avoid high-frequency React rerenders for frame-loop memory:

- `videoRef`: live video element
- `overlayRef`: visible overlay canvas
- `newCanvas`: hidden processing canvas
- `sparkRef`: attention sparkline canvas
- `streamRef`: active media stream
- `frameRef`: requestAnimationFrame id
- `runningRef`: loop control flag
- `modelsRef`: MediaPipe model instances
- `runtimeRef`: rolling histories, EMAs, gesture counts, FPS counters
- `sessionRef`: Student Mode session tracker

## Frame Loop Implementation

Both monitor components run a loop with `requestAnimationFrame`.

```text
loop()
  if not running: return
  get video and overlay
  ensure video/model readiness
  draw current video frame to hidden canvas
  run faceLandmarker.detectForVideo(video, timestamp)
  run handLandmarker.detectForVideo(video, timestamp)
  if face exists:
    compute quality metrics
    run quality checks
    combine checks in videoQualityEngine
    draw overlay if enabled
    compute head pose
    if quality blocks:
      update UI and skip behavior scoring
    else:
      detect gestures
      compute attention
      compute learner states
      update UI
      record session frame in Student Mode
  else:
    run missingFaceCheck
    clear overlay
    reduce attention toward zero
  update FPS
  schedule next frame
```

The loop uses `performance.now()` for MediaPipe timestamps, frame histories, popup persistence, and FPS calculation.

## Video Quality Pipeline

The project separates low-level metric extraction from status classification.

### Metric Extraction

Metrics are computed from landmarks and canvas pixels:

- `getFacebox`: normalized and pixel-space face bounding box.
- `getFaceArea`: normalized face area.
- `getFaceCenter`: normalized center point.
- `getFaceBrightness`: average brightness inside face crop.
- `getCheekBrightness`: left/right cheek brightness and imbalance.
- `getBlurScore`: Laplacian variance over the face crop.
- `getOcclusionMetrics`: hand-on-face, landmark integrity, face area drop, and occlusion score.
- `getMultiFaceMetrics`: number of detected faces.

### Status Checks

The check modules convert metrics into status strings, suggestions, severities, and popup flags:

- `checkBrightness`
- `facedistancecheck`
- `checkFacePosition`
- `unevenLightingCheck`
- `blurCheck`
- `occlusionCheck`
- `multiFaceCheck`
- `missingFaceCheck`

### Quality Engine

`videoQualityEngine` combines checks into one decision:

- Starts with `overallQualityScore = 100`.
- Applies penalties.
- Creates warnings and blocking issues.
- Sets severity band.
- Chooses the active popup.
- Sets `shouldBlockAnalysis`.

If `shouldBlockAnalysis` is true, attention and learner-state scoring is skipped for that frame.

## Important Thresholds

### Brightness

Source: `src/modules/shared/check/brightnesscheck.js`

```text
brightness < 45: poor, too dark
45 <= brightness < 70: acceptable, low brightness
70 <= brightness <= 180: excellent
180 < brightness <= 220: acceptable, bright warning
brightness > 220: poor, too bright
```

Poor brightness must persist for more than 3000 ms before the popup is shown.

### Face Distance

Source: `src/modules/shared/check/facedistancecheck.js`

```text
FaceArea < 0.02: too far
FaceArea > 0.55: too close
otherwise: good distance
```

Bad distance must persist for more than 3000 ms before the popup is shown.

### Face Position

Source: `src/modules/shared/check/facepositioncheck.js`

```text
faceCenterX < 0.4: left aligned
faceCenterX > 0.6: right aligned
faceCenterY < 0.4: top aligned
faceCenterY > 0.6: bottom aligned
otherwise: centered
```

Bad position must persist for more than 3000 ms before popup activation.

### Lighting Balance

Source: `src/modules/shared/check/unevenlightingcheck.js`

```text
lightingDifferencePercent <= 30: excellent
30 < lightingDifferencePercent <= 65: quality reduced by 10
lightingDifferencePercent > 65: quality reduced by 20
```

The current scoring maps these reductions to severity bands. Persistent poor severity for more than 4000 ms shows the uneven-lighting popup.

### Blur

Source: `src/modules/shared/check/blurcheck.js`

```text
blurScore < 50: poor, image blurry
50 <= blurScore < 80: acceptable, slight blur
blurScore >= 80: excellent, image sharp
```

Poor blur must persist for more than 3000 ms before popup activation.

### Missing Face

Source: `src/modules/shared/check/missingFaceCheck.js`

```text
missingFrames >= 10: active missing-face warning
```

### Multi-Face

Source: `src/modules/shared/check/multiFaceCheck.js`

```text
faceCount > 1: multipleFacesDetected
history length: 15 samples
average history score > 0.4 for more than 5000 ms: active warning
```

## Attention Implementation

Source: `src/modules/student/attentionTracking.js`

Attention uses MediaPipe blendshape scores and head pose.

Key ingredients:

- Eye blink blendshapes estimate eye openness.
- Eye look blendshapes estimate gaze direction.
- Yaw and pitch estimate head orientation.

Formula:

```text
eyesOpen = 1 - (eyeBlinkLeft + eyeBlinkRight) / 2
eyesOnScreen = clamp(1 - gazePenalty)
headScore = 1 - headOrientationPenalty(yawDeg, pitchDeg)
attention = clamp(0.6 * eyesOnScreen + 0.2 * headScore + 0.2 * eyesOpen)
```

The raw score is pushed into a 3000 ms history and aggregated with exponential time weighting. Student Mode adds an extra momentum smoother:

```text
attentionMomentum = 0.85 * previousMomentum + 0.15 * rawAttention
```

## Head Pose Implementation

Source: monitor components

The app uses MediaPipe's facial transformation matrix:

```text
yaw = atan2(matrix[2], matrix[10]) * 180 / pi
pitch = asin(-matrix[6]) * 180 / pi
```

The monitor stores recent head pose samples in `runtime.headHist` for nodding, shaking, and attention calculations.

## Gesture Implementation

Source: `src/modules/student/raiseHandDetection.js`

### Hand Validation

`isValidHand` rejects hands when:

- Fewer than 21 landmarks are present.
- Required landmarks are missing.
- Hand size is too small.
- Too few landmarks are in or near normalized frame bounds.
- Palm size is outside a reasonable range.
- Average finger distance is implausible.

### Thumbs Up and Thumbs Down

Thumb gestures require:

- Valid hand landmarks.
- Face landmarks.
- Strong thumb extension.
- Other fingers curled.
- Thumb direction clearly up or down.
- Hand far enough from the face.

The detector returns the best score across all detected hands.

### Raise Hand

Raise hand requires:

- Valid hand.
- At least three extended fingers.
- Fingers above the wrist.
- Palm above the forehead.
- Mostly vertical hand orientation.

Score:

```text
raiseHandScore =
  0.40 * raisedPose
  + 0.25 * handRaised
  + 0.20 * fingersExtended
  + 0.15 * verticalOriented
```

The result is clamped to `[0, 1]`.

## Gesture Exclusivity

Source: `src/modules/student/gestureDecision.js`

The app avoids displaying conflicting hand gestures at full confidence.

`exclusiveHandGestures` compares:

- Raise hand
- Thumb up
- Thumb down

If one score is clearly strongest above 0.6 and exceeds the others by more than 0.15, the weaker gestures are suppressed. If the result is ambiguous, the scores are proportionally capped.

`exclusiveAgreeDisagree` does the same for agreeing and disagreeing signals.

## Learner-State Implementation

Source: `src/modules/student/learnerStateAnalysis.js`

Learner-state scores are not ML classifications. They are heuristic composites from visible signals.

### Confused

Uses:

- Brow down
- Inner brow raise
- Brow asymmetry
- Eye squint
- Mild mouth opening
- Mouth frown
- Head tilt
- Hand near chin

The score is reduced when anger-like or boredom-like patterns dominate.

### Bored

Uses:

- Low attention
- Gaze avoidance
- Flat stare
- Low blink rate
- Drooping eyes
- Yawn or jaw opening
- Frown or mouth press
- Hand covering mouth
- Head resting on hand
- Eye roll

### Thinking

Uses:

- Attention gate
- Attention score
- Direct gaze
- Mouth press
- Hand near chin
- Head tilt

Thinking and bored scores are made mutually exclusive by `exclusiveThinkingBored`.

### Agreeing

Uses recent pitch movement as a nodding proxy.

```text
nodScore = clamp(recentPitchChange / 90)
```

Student Mode additionally smooths nodding with an EMA and counts activation transitions.

### Disagreeing

Uses yaw oscillation:

- Samples from the last 900 ms.
- Yaw range must be between 8 and 32 degrees.
- Average yaw must stay near center.
- At least two direction reversals are required.

### Surprised

Uses jaw opening and eye-wide blendshapes.

### Display State

`selectDisplayLearnerState` chooses the strongest non-neutral learner state when it exceeds `0.45`. Otherwise:

- Attention >= 0.65 displays `Focused`.
- Attention <= 0.35 displays `Low attention`.
- Otherwise displays `Neutral`.

## Session Report Implementation

Source: `src/modules/shared/session/createSessionTracker.js`

Student Mode creates a session tracker with `createSessionTracker()`.

Lifecycle:

1. `reset()` starts a new report.
2. `recordFrame()` receives attention, learner state, quality, gesture counts, and issue flags.
3. `createReport()` calculates final report values and stops the tracker.

Tracked values:

- Start time
- End time
- Duration seconds
- Frame count
- Attention average/min/max
- Latest gesture counts
- Quality issue counts
- Blocked seconds
- Learner state averages
- Top learner state
- Recommendations

Recommendations are generated from low attention and quality issue counts.

## UI Implementation

### Main Monitor Layout

Both monitor screens render:

- Sticky topbar
- Camera/video card
- Overlay canvas
- Quality popup
- Side metrics pane
- Attention meter
- Video quality details
- Learner-state rows
- Gesture counts
- FPS display
- Sparkline canvas

Student Mode additionally renders `SessionReport` after stop.

### Overlay Drawing

The monitors draw:

- Small dots for all face landmarks.
- Larger colored points for key facial landmarks.
- A face oval path.
- Hand skeleton connections.
- Hand landmark points colored by finger group.

The video and overlay are mirrored using `transform: scaleX(-1)`.

### Sparkline

`drawSparkline` stores recent attention values in `runtime.sparkBuf`, shifts old values, and draws a simple line chart into a canvas.

## Cleanup and Resource Management

Both monitor components stop the stream by:

- Setting `runningRef.current = false`
- Cancelling the animation frame
- Calling `track.stop()` on every media stream track
- Clearing `video.srcObject`

Cleanup also runs in a React `useEffect` unmount handler.

## Known Implementation Risks

- `StudentAttentionMonitor.jsx` and `InterviewMonitor.jsx` duplicate most logic.
- Interview Mode is not yet behaviorally specialized.
- Runtime model paths depend on external URLs.
- The setup screen and monitors request camera access separately.
- There are no automated tests for the heuristic thresholds.
- Some display strings and icons show encoding corruption.
- The quality engine contains fixed constants that may need calibration.
- Large files make future changes harder to isolate.

## Recommended Refactor Plan

1. Extract shared model/camera/frame-loop logic into `useVisionMonitor`.
2. Extract overlay drawing into `modules/shared/drawing`.
3. Extract common quality orchestration into `modules/shared/quality`.
4. Keep student-specific logic inside `modules/student`.
5. Add `modules/interview` for interview-specific metrics.
6. Add tests for check modules and report generation.
7. Add a configuration file for thresholds.
8. Add report export and a documented evaluation dataset later.
