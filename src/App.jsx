import React, { useState } from "react";
import StudentMode from "./modes/StudentMode";
import SetupScreen from "./components/setupScreen.jsx";

function App() {
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
      <StudentMode />
    </div>
  );
}

export default App;
