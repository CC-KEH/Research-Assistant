import { animate } from "framer-motion";
import { useEffect, useState } from "react";

export function useAnimatedText(text: string, delimiter: string = "") {
  const [cursor, setCursor] = useState(0);
  const [startingCursor, setStartingCursor] = useState(0);
  const [prevText, setPrevText] = useState(text);

  if (prevText !== text) {
    setPrevText(text);
    setStartingCursor(0); // Always restart from beginning
  }

  useEffect(() => {
    const parts = text.split(delimiter);
    const totalItems = parts.length;

    const speedPerItem = 0.01;
    const maxDuration = 5;
    const duration = Math.min(totalItems * speedPerItem, maxDuration);

    const controls = animate(startingCursor, totalItems, {
      duration,
      ease: "linear",
      onUpdate(latest) {
        setCursor(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [startingCursor, text, delimiter]);

  return text.split(delimiter).slice(0, cursor).join(delimiter);
}
