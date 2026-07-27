# Contributing

Thank you for considering a contribution to Body Language Monitor.

This project is a browser-based computer vision prototype for webcam-based attention, gesture, and video quality analysis. Contributions should keep the project transparent, reproducible, and privacy-conscious.

## Getting Started

Requirements:

* Node.js 18 or newer
* npm
* A browser with camera access
* `localhost` or HTTPS for camera permissions

Set up the project:

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

## Contribution Guidelines

Before opening a pull request:

* Keep changes focused on one feature, fix, or documentation improvement.
* Explain what changed and why.
* Run `npm run build` and confirm it succeeds.
* Do not commit `node_modules`, local environment files, private data, API keys, credentials, webcam recordings, screenshots containing personal information, or unrelated generated files.
* Keep camera processing local unless a change clearly documents and justifies otherwise.
* Update `README.md` or other documentation when behavior, setup steps, limitations, or dependencies change.
* Credit any external ideas, datasets, models, libraries, code examples, or templates used in a contribution.

## Privacy and Safety

This project processes webcam input in the browser. Contributions must respect user privacy and should not add hidden data collection, remote video upload, tracking, or analytics.

If a feature sends any data outside the browser, it must be clearly documented, optional, and visible to users.

## Reporting Issues

When reporting a bug, include:

* The browser and operating system used.
* The steps needed to reproduce the issue.
* The expected behavior.
* The actual behavior.
* Any relevant console error messages.

Avoid sharing images, videos, logs, or files that contain personal or sensitive information.

## Pull Requests

Pull requests should include:

* A short summary of the change.
* Any testing performed.
* Any known limitations or follow-up work.
* Documentation updates, when relevant.

## Maintainer Contact

Maintainer: Add your name here.

Contact: Add your email, GitHub profile, or preferred contact link here.
