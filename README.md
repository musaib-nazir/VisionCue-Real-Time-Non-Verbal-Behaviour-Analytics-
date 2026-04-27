# Body Language Monitor

This project contains a vision-based analytics system for monitoring behavior, engagement, and communication patterns across different modes.

The app uses:

* `React` for the UI
* `Vite` for local development and builds
* `@mediapipe/tasks-vision` for on-device face and hand landmark inference

The system is now structured into separate monitoring modes:

* **Student Mode** → learner attention and engagement tracking
* **Interview Mode** → candidate communication and interview behavior analysis

The original student monitoring component is available as [src/components/StudentAttentionMonitor.jsx](/Users/monis/work/emly/repos/body-language/src/components/StudentAttentionMonitor.jsx).

The original standalone prototype is still available as [v10.html](/Users/monis/work/emly/repos/body-language/v10.html).

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

Inference runs fully in the browser. Video is not uploaded by the app.

---

## Project Structure

### Core Files

* [index.html](/Users/monis/work/emly/repos/body-language/index.html): Vite entry HTML
* [src/main.jsx](/Users/monis/work/emly/repos/body-language/src/main.jsx): React bootstrap
* [src/App.jsx](/Users/monis/work/emly/repos/body-language/src/App.jsx): top-level app wrapper
* [src/styles.css](/Users/monis/work/emly/repos/body-language/src/styles.css): app styling
* [v10.html](/Users/monis/work/emly/repos/body-language/v10.html): original pure-JS prototype

### Components

* [src/components/StudentAttentionMonitor.jsx](/Users/monis/work/emly/repos/body-language/src/components/StudentAttentionMonitor.jsx): student engagement monitoring
* [src/components/InterviewMonitor.jsx](/Users/monis/work/emly/repos/body-language/src/components/InterviewMonitor.jsx): interview behavior monitoring

### Shared Modules

Reusable logic has been refactored into shared modules to avoid duplication across modes.

#### Shared Checks

* [src/shared/checks/](/Users/monis/work/emly/repos/body-language/src/shared/checks/)

Contains reusable evaluation logic such as:

* brightness checks
* attention scoring
* head pose checks
* behavioral threshold checks
* gesture interpretation logic

#### Shared Detection Utilities

* [src/shared/detection/](/Users/monis/work/emly/repos/body-language/src/shared/detection/)

Contains reusable detection helpers such as:

* face measurements
* landmark calculations
* brightness measurement
* head pose extraction
* timed value tracking helpers

This structure allows both Student Mode and Interview Mode to use the same detection pipeline while keeping mode-specific logic separate.

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
3. Select the required monitoring mode:

   * Student Mode
   * Interview Mode
4. Click `Start camera`.
5. Allow browser camera access.
6. Use `Toggle overlay` to show or hide landmarks.
7. Use `Stop` to release the camera stream.

---

## Notes

* Mediapipe model assets are loaded at runtime.
* Camera access will fail on insecure origins other than `localhost`.
* Results are heuristic and approximate.
* Inference runs locally in the browser for privacy.
* This should not be treated as a diagnostic, surveillance, or proctoring tool.

---

## Refactoring Notes

Compared with the original HTML prototype, the React application now:

* Moves monitoring into reusable React components
* Separates Student Mode and Interview Mode into dedicated modules
* Uses React state and refs instead of direct DOM wiring
* Cleans up camera streams and animation frames on stop/unmount
* Introduces shared reusable detection modules for both monitoring modes
* Introduces shared check logic for scoring and behavioral evaluation
* Reduces duplicate code across components
* Improves scalability for adding future monitoring modes
* Preserves the original overlay styling and learner-state behavior as closely as possible

This modular architecture makes the system easier to maintain, extend, and adapt for additional behavioral analytics use cases in the future.
