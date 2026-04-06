# Body Language Monitor

This project contains a student attention and learner-state monitor.

The app uses:

- `React` for the UI
- `Vite` for local development and builds
- `@mediapipe/tasks-vision` for on-device face and hand landmark inference

The main React component is [src/StudentAttentionMonitor.jsx](/Users/monis/work/emly/repos/body-language/src/StudentAttentionMonitor.jsx). The original standalone prototype is still available as [v10.html](/Users/monis/work/emly/repos/body-language/v10.html).

## What It Does

The monitor opens the user-facing camera and estimates:

- Attention score
- Agreeing / disagreeing
- Raise hand
- Focus
- Disengaged state
- Confused state

It also renders:

- Live mirrored camera preview
- Canvas overlay with face mesh highlights and hand landmarks
- Attention sparkline
- Gesture counters

Inference runs in the browser. Video is not uploaded by the app.

## Project Structure

- [index.html](/Users/monis/work/emly/repos/body-language/index.html): Vite entry HTML
- [src/main.jsx](/Users/monis/work/emly/repos/body-language/src/main.jsx): React bootstrap
- [src/App.jsx](/Users/monis/work/emly/repos/body-language/src/App.jsx): top-level app wrapper
- [src/StudentAttentionMonitor.jsx](/Users/monis/work/emly/repos/body-language/src/StudentAttentionMonitor.jsx): main monitoring component
- [src/styles.css](/Users/monis/work/emly/repos/body-language/src/styles.css): app styling
- [v10.html](/Users/monis/work/emly/repos/body-language/v10.html): original pure-JS prototype

## Getting Started

Requirements:

- Node.js 18+ recommended
- A browser with camera access
- `HTTPS` or `localhost` for camera permissions

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

## How To Use

1. Start the dev server.
2. Open the local app URL shown by Vite.
3. Click `Start camera`.
4. Allow browser camera access.
5. Use `Toggle overlay` to show or hide landmarks.
6. Use `Stop` to release the camera stream.

## Notes

- The Mediapipe model assets are loaded at runtime.
- Camera access will fail on insecure origins other than `localhost`.
- Results are heuristic and approximate.
- This should not be treated as a diagnostic, surveillance, or proctoring tool.

## Conversion Notes

Compared with the original HTML prototype, the React app now:

- Moves the monitor into a reusable named component: `StudentAttentionMonitor`
- Uses React state and refs instead of direct DOM wiring
- Cleans up camera streams and animation frames on stop/unmount
- Preserves the original overlay styling and learner-state behavior as closely as possible
