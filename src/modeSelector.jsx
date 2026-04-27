import React from "react";

const ModeSelector = ({ currentMode, setCurrentMode }) => {
  return (
    <div style={{ marginBottom: "20px" }}>
      <button onClick={() => setCurrentMode("student")}>
        Student Mode
      </button>

      <button
        onClick={() => setCurrentMode("interview")}
        style={{ marginLeft: "10px" }}
      >
        Interview Mode
      </button>
    </div>
  );
};

export default ModeSelector;