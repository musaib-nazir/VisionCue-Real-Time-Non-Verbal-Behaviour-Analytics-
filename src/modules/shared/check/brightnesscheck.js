export const checkBrightness = ( brightness, badLightiningRef) => {

 

    let lightingStatus = "";
      let lightingSuggestion = "";
      let showLightingPopup = false;

      if (brightness < 40) {
        lightingStatus = "Too Dark ❌";
        lightingSuggestion = "Move closer to a light source";

        if (!badLightiningRef.current) {
          badLightiningRef.current = performance.now();
        }
        const badDuration = performance.now() - badLightiningRef.current;
        if (badDuration > 3000) {
          showLightingPopup = true;
        }
      } else if (brightness > 200) {
        const badDuration = performance.now() - badLightiningRef.current;
        lightingStatus = "Too Bright ⚠️";
        lightingSuggestion =
          "Reduce direct light or move away from strong light";

        if (!badLightiningRef.current) {
          badLightiningRef.current = performance.now();
        }
        if (badDuration > 3000) {
          showLightingPopup = true;
        }
      } else {
        lightingStatus = "Lighting Good ✅";
        lightingSuggestion = "Lighting is suitable for video capture";
        badLightiningRef.current = null;
        showLightingPopup = false;
      }


  return {
    lightingStatus,
    lightingSuggestion,
    showLightingPopup,
  };







}