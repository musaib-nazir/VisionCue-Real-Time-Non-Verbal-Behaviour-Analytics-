import React from "react";
import StudentAttentionMonitor from "../StudentAttentionMonitor";

const StudentMode = () => {
  return (
    <div className="shell">
      <header className="topbar">
        <h1>Student Analysis Mode</h1>
      </header>

      <main>
        <StudentAttentionMonitor />
      </main>
    </div>
  );
}

export default StudentMode;