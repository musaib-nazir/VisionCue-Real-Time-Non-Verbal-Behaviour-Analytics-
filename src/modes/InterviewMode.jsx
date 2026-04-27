import React from "react";
import InterviewMonitor from "../InterviewMonitor";

const InterviewMode = () => {
  return (
       <div className="shell">
         <header className="topbar">
           <h1>Interview Assessment Mode</h1>
         </header>
   
         <main>
           <InterviewMonitor />
         </main>
       </div>
  );
};

export default InterviewMode;