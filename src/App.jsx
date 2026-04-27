import React, { useState } from "react";
import StudentMode from "./modes/StudentMode";
import InterviewMode from "./modes/InterviewMode";
import ModeSelector from "./ModeSelector";

function App() {
  const [currentMode, setCurrentMode] = useState("student");

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