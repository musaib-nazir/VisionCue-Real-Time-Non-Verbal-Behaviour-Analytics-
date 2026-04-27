import { clamp } from "./attentionTracking";

export function exclusiveAgreeDisagree(agreeRaw, disagreeRaw, tUp = 0, tDown = 0) {
  let agree = clamp(agreeRaw);
  let disagree = clamp(disagreeRaw);
  if (tUp >= 0.75 && tUp - disagree >= 0.05) disagree = 0;
  if (tDown >= 0.65 && tDown - agree >= 0.05) agree = 0;
  const strongest = Math.max(agree, disagree);
  if (strongest > 0.45 && Math.abs(agree - disagree) > 0.06) {
    if (agree > disagree) disagree = 0;
    else agree = 0;
  } else {
    const sum = agree + disagree + 1e-6;
    agree = (agree / sum) * Math.min(sum, 0.35);
    disagree = (disagree / sum) * Math.min(sum, 0.35);
  }
  return { agree: clamp(agree), disagree: clamp(disagree) };
}

export function exclusiveHandGestures(raiseHandRaw, thumbUpRaw, thumbDownRaw) {
  let raiseHand = clamp(raiseHandRaw);
  let thumbUp = clamp(thumbUpRaw);
  let thumbDown = clamp(thumbDownRaw);
  const max = Math.max(raiseHand, thumbUp, thumbDown);
  if (max > 0.6) {
    if (
      raiseHand === max &&
      raiseHand - thumbUp > 0.15 &&
      raiseHand - thumbDown > 0.15
    ) {
      thumbUp = 0;
      thumbDown = 0;
    } else if (
      thumbUp === max &&
      thumbUp - raiseHand > 0.15 &&
      thumbUp - thumbDown > 0.15
    ) {
      raiseHand = 0;
      thumbDown = 0;
    } else if (
      thumbDown === max &&
      thumbDown - raiseHand > 0.15 &&
      thumbDown - thumbUp > 0.15
    ) {
      raiseHand = 0;
      thumbUp = 0;
    } else {
      const sum = raiseHand + thumbUp + thumbDown + 1e-6;
      raiseHand = (raiseHand / sum) * Math.min(sum, 0.4);
      thumbUp = (thumbUp / sum) * Math.min(sum, 0.4);
      thumbDown = (thumbDown / sum) * Math.min(sum, 0.4);
    }
  }
  return {
    raiseHand: clamp(raiseHand),
    thumbUp: clamp(thumbUp),
    thumbDown: clamp(thumbDown),
  };
}
