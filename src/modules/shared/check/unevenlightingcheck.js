export const unevenLightingCheck = (lightingDifference, unevenLightingRef) => { let showUnevenLightingPopup = false;
      let unevenLightingStatus = "";
      let unevenLightingSuggestion = "";
      if (lightingDifference > 70) {
        if (!unevenLightingRef.current) {
          unevenLightingRef.current = performance.now();
        }
        const unevenDuration = performance.now() - unevenLightingRef.current;
        if (unevenDuration > 3000) {
          showUnevenLightingPopup = true;
          unevenLightingStatus = "Uneven Lighting Detected ⚠️";
          unevenLightingSuggestion =
            "Try to have more balanced lighting on both sides of your face";
        }

        console.log("⚠️ Uneven Lighting Detected");
      } else {
        unevenLightingRef.current = null;
        ((showUnevenLightingPopup = false),
          (unevenLightingStatus = "Lighting balanced"));
        unevenLightingSuggestion = "";

        console.log("✅ Balanced Lighting");
      }


return{
unevenLightingStatus,unevenLightingSuggestion,
showUnevenLightingPopup


}







}