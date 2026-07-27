# Body Language Monitor

Vision-based browser analytics for monitoring attention, engagement, and communication patterns across multiple modes.

The app uses:

* `React` for the UI
* `Vite` for local development and builds
* `@mediapipe/tasks-vision` for on-device face and hand landmark inference

The system is structured into separate monitoring modes:

* **Student Mode**: learner attention and engagement tracking
* **Interview Mode**: candidate communication and interview behavior analysis

Inference runs in the browser. Video is not uploaded by the app.

---

## What It Does

The application opens the user-facing camera and performs real-time browser-based analysis using face landmarks, hand landmarks, and behavioral heuristics.

### Student Mode detects:

* Attention score
* Agreeing / disagreeing
* Raise hand
* Focus
* Disengaged state
* Confused state

### Interview Mode detects:

* Eye contact
* Confidence indicators
* Head stability
* Speaking posture
* Hand movement patterns
* Nervous behavior signals
* Candidate engagement level

It also renders:

* Live mirrored camera preview
* Canvas overlay with face mesh highlights and hand landmarks
* Attention / behavior sparkline
* Gesture counters
* Real-time behavior assessment panels
* Pre-session environment checks
* Student session summary reports

---

## Project Structure

### Core Files

* `index.html`: Vite entry HTML
* `src/main.jsx`: React bootstrap
* `src/App.jsx`: top-level app wrapper
* `src/styles.css`: app styling

### Components

* `src/StudentAttentionMonitor.jsx`: student engagement monitoring
* `src/InterviewMonitor.jsx`: interview behavior monitoring
* `src/components/setupScreen.jsx`: pre-session camera and environment verification
* `src/modeSelector.jsx`: mode switching UI
* `src/modes/`: mode wrappers

### Shared Modules

Reusable logic has been refactored into shared modules to avoid duplication across modes.

* `src/modules/shared/check/`: brightness, face position, distance, occlusion, blur, lighting balance, and multi-face checks
* `src/modules/shared/detection/`: face measurements, landmark calculations, brightness, blur, and model helpers
* `src/modules/shared/Engine/videoQualityEngine.js`: combined quality scoring and blocking decisions
* `src/modules/shared/session/createSessionTracker.js`: student session summary aggregation

### Student Modules

* `src/modules/student/attentionTracking.js`
* `src/modules/student/raiseHandDetection.js`
* `src/modules/student/learnerStateAnalysis.js`
* `src/modules/student/gestureDecision.js`

---

## Getting Started

Requirements:

* Node.js 18+ recommended
* A browser with camera access
* `HTTPS` or `localhost` for camera permissions

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## How To Use

1. Start the dev server.
2. Open the local app URL shown by Vite.
3. Complete the setup verification.
4. Select the required monitoring mode:
   * Student Mode
   * Interview Mode
5. Click `Start camera`.
6. Allow browser camera access.
7. Use `Toggle overlay` to show or hide landmarks.
8. Use `Stop` to release the camera stream.

---

## Notes

* Mediapipe model assets are loaded at runtime.
* Camera access will fail on insecure origins other than `localhost`.
* Results are heuristic and approximate.
* Inference runs locally in the browser for privacy.
* This should not be treated as a diagnostic, surveillance, or proctoring tool.

---

## License

This project is released under the Apache License 2.0. See `LICENSE` for the full license text.

---

## Attribution

This project uses the following open-source technologies and browser APIs:

* `React` and `React DOM` for the user interface.
* `Vite` and `@vitejs/plugin-react` for local development and production builds.
* `@mediapipe/tasks-vision` for browser-based face and hand landmark inference.
* MediaPipe Face Landmarker and Hand Landmarker model assets loaded at runtime from Google-hosted MediaPipe model storage.
* MediaPipe WASM assets loaded at runtime from jsDelivr.
* Browser camera, video, and canvas APIs, including `navigator.mediaDevices.getUserMedia`.

No custom machine learning model, private dataset, or backend API is included in this repository.

---

## Limitations

This project is a rule-based prototype built on top of pretrained landmark models. Its results are approximate and may be affected by camera quality, lighting, face position, occlusion, network availability for model loading, browser support, and device performance.

The app should not be used as a medical, diagnostic, surveillance, proctoring, hiring, grading, or final decision-making system. Interview Mode currently shares many behavioral signals with Student Mode and is not a fully separate interview analytics model.

If AI-generated code, starter templates, or external examples were used during development, disclose them here before publishing the repository.

---

## Maintainer Contact

Maintainer: Add your name here.

Contact: Add your email, GitHub profile, or preferred contact link here.

Issues and pull requests are welcome through the repository issue tracker.

---

## Recommended Next Work

* Extract the duplicated camera/model/overlay loop from the student and interview monitors into a shared hook.
* Make both modes use the same quality engine and report format.
* Add unit tests for the shared check modules.
* Add export options for session reports.
