# Tech Stack

This document summarizes the technologies, tools, libraries, browser APIs, and architectural patterns identified in this project.

## Project Type

- Browser-based single-page application
- Client-side computer vision and body-language monitoring prototype
- No backend server or database code is present in this repository
- Production build output is present in `dist/`

## Core Frontend Stack

- React `^19.1.0`
  - Used for the application UI and stateful monitoring screens.
  - Main entry files include `src/main.jsx`, `src/App.jsx`, `src/StudentAttentionMonitor.jsx`, and `src/InterviewMonitor.jsx`.
- React DOM `^19.1.0`
  - Used to mount the React app into the browser DOM.
- JavaScript ES modules
  - The project uses `"type": "module"` in `package.json`.
  - Source files use `import` / `export` syntax.
- CSS
  - Styling is handled through `src/styles.css`.
  - The interface includes camera panels, setup flow, overlays, popups, monitoring cards, and reports.

## Build and Development Tools

- Vite `^7.0.0`
  - Used as the development server and production build tool.
  - Scripts:
    - `npm run dev`
    - `npm run build`
    - `npm run preview`
- `@vitejs/plugin-react` `^5.0.0`
  - Vite plugin for React support.
- npm
  - Dependency management is handled through `package.json` and `package-lock.json`.
- Node.js
  - Required to install dependencies and run the Vite tooling.

## Computer Vision and ML Stack

- `@mediapipe/tasks-vision` `^0.10.22`
  - Main computer vision dependency.
  - Used for on-device browser inference.
  - The project imports:
    - `FilesetResolver`
    - `FaceLandmarker`
    - `HandLandmarker`
- MediaPipe Face Landmarker
  - Used for face landmarks, facial blendshapes, and facial transformation matrices.
  - Configured with `runningMode: "VIDEO"`.
  - Monitor screens configure `numFaces: 5` for multi-face checks.
  - Shared setup model loading is handled in `src/modules/shared/detection/loadFaceModel.js`.
- MediaPipe Hand Landmarker
  - Used in monitor screens for hand landmarks and gesture-related checks.
  - Configured with `runningMode: "VIDEO"` and `numHands: 2`.
- Runtime model/WASM loading
  - MediaPipe WASM files are loaded from jsDelivr.
  - Face model assets are loaded from Google-hosted MediaPipe model storage.
  - The first model load requires network access.

## Browser APIs Used

- `navigator.mediaDevices.getUserMedia`
  - Used to request webcam access.
  - Camera access requires `localhost` or HTTPS in normal browser conditions.
- HTML video element
  - Used for the live mirrored camera preview.
- HTML canvas API
  - Used for frame sampling, overlay drawing, image processing, and sparklines.
  - Hidden canvases are used for pixel-level analysis.
- `requestAnimationFrame`
  - Used to run the real-time monitoring loop.
- `performance.now`
  - Used for timing, smoothing, frame checks, and warning durations.

## Application Features and Domains

- Student Mode
  - Attention scoring
  - Raise-hand detection
  - Agreeing/disagreeing gesture interpretation
  - Learner-state style heuristic scoring
  - Session summary reporting
- Interview Mode
  - Candidate monitoring interface
  - Face, hand, attention, quality, and behavior signal analysis
  - Current implementation shares many student-mode analysis modules
- Setup Screen
  - Pre-session camera and environment verification
  - Checks camera access, face visibility, lighting, distance, position, and focus

## Shared Analysis Modules

- Video quality checks
  - Brightness
  - Face position
  - Face distance
  - Uneven lighting
  - Occlusion
  - Blur/focus
  - Missing face
  - Multiple faces
- Detection helpers
  - Face box calculation
  - Face area calculation
  - Face center calculation
  - Face brightness calculation
  - Cheek brightness calculation
  - Blur score calculation
  - Occlusion metrics
  - Multi-face metrics
- Quality engine
  - `src/modules/shared/Engine/videoQualityEngine.js`
  - Combines individual quality checks into overall scoring, severity, suggestions, and blocking decisions.
- Session tracking
  - `src/modules/shared/session/createSessionTracker.js`
  - Aggregates student session data and recommendations.

## Data and Processing Architecture

- All video processing runs in the browser.
- No backend upload flow is implemented.
- Camera frames are sampled into canvas.
- MediaPipe returns landmarks, blendshapes, and matrices.
- Project modules convert those outputs into heuristic scores and UI warnings.
- The project is best described as rule-based behavioral analytics built on top of pretrained computer vision landmark models.

## Repository and Output Tools

- Git
  - A `.git` directory is present.
- `.gitignore`
  - Present at the project root.
- `dist/`
  - Contains generated production build files.
- `node_modules/`
  - Local npm dependencies are installed.

## Not Identified in This Project

- No backend framework such as Express, Django, Flask, Laravel, or Spring was identified.
- No database such as MongoDB, PostgreSQL, MySQL, Firebase, or SQLite was identified.
- No authentication system was identified.
- No API client such as Axios was identified.
- No test framework such as Jest, Vitest, Cypress, or Playwright was identified.
- No TypeScript configuration was identified.
- No linting or formatting configuration such as ESLint or Prettier was identified.
- No Docker or container configuration was identified.
- No CI/CD workflow files were identified.
