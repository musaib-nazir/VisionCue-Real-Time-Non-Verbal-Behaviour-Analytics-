// modules/shared/check/multiFaceCheck.js
export function multiFaceCheck(metrics, ref) {
  const { faceCount, multipleFacesDetected } = metrics;

 
  if (!ref.current) {
    ref.current = {
      history: [],
      active: false,
       startTime: null, 
    };
  }

  const memory = ref.current;

  const score = multipleFacesDetected ? 1 : 0;

  memory.history.push(score);


  if (memory.history.length > 15) {
    memory.history.shift();
  }


  const avg =
    memory.history.reduce((a, b) => a + b, 0) /
    memory.history.length;

if(avg>0.4){
if(!memory.startTime){


memory.startTime = performance.now()


}

const duration = performance.now()-memory.startTime;

    if (duration > 5000) {
      memory.active = true;
    }

}else{
memory.startTime = null;
memory.active=false;



}


  let multiFaceStatus = "Single face detected ✅";
  let multiFaceSuggestion = "Only one person should be visible";
  let showMultiFacePopup = false;


  if (memory.active) {
    multiFaceStatus = "Multiple faces detected ❌";
    multiFaceSuggestion =
      "Ensure only one person is visible in the camera.";
    showMultiFacePopup = true;


  }else{

    multiFaceStatus = "Single face detected ✅";
    multiFaceSuggestion = "Only one person should be visible";
    showMultiFacePopup = false;
  }

  return {
    multiFaceStatus,
    multiFaceSuggestion,
    showMultiFacePopup,
    faceCount,
  };
}
