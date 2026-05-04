export function detectFaceLandmarks(faceLandmarker, video) {

 if (!faceLandmarker || !video || video.readyState < 2) {
    return null;
  }

  const ts = performance.now();
  const result = faceLandmarker.detectForVideo(video, ts);
  if (result?.faceLandmarks?.length > 0) {
    return result.faceLandmarks[0]; // 👈 return landmarks
  }





return null;









}