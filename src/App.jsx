import React, { useState } from "react";
import StudentMode from "./modes/StudentMode";
import InterviewMode from "./modes/InterviewMode";
import ModeSelector from "./ModeSelector";
import SetupScreen from "./components/setupScreen.jsx";

function App() {
  const [currentMode, setCurrentMode] = useState("student");
  const [setupComplete, setSetupComplete] = useState(false);
  if (!setupComplete) {
    return (
      <SetupScreen
        onStart={() => setSetupComplete(true)}
      />
    );
  }
  return (
    <div>
      <ModeSelector
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

      {currentMode === "student" && <StudentMode />}
      {currentMode === "interview" && <InterviewMode />}
    </div>
  );
}

export default App;