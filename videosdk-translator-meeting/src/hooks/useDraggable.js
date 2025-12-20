import { useEffect, useRef, useState } from "react";

function useDragging() {
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const [relPos, setRelPos] = useState({
    relX: 0,
    relY: 0,
  });

  function onStart(e) {
    setIsDragging(true);
    const body = document.body;
    const box = ref.current.getBoundingClientRect();
    setRelPos({
      relX: e.pageX - (box.left + body.scrollLeft + body.clientLeft),
      relY: e.pageY - (box.top + body.scrollTop + body.clientTop),
    });
  }

  function onMove(e) {
    if (!wasDragged) setWasDragged(true);
    const x = Math.trunc(e.pageX - relPos.relX);
    const y = Math.trunc(e.pageY - relPos.relY);
    const screenX = window.screen.availWidth;
    const screenY = window.screen.availHeight;
    if (x !== pos.x || y !== pos.y) {
      setPos({
        x:
          x < 0 || x + ref.current.getBoundingClientRect().width + 30 > screenX
            ? pos.x - relPos.x
            : x,
        y:
          y < 0 ||
          y + ref.current.getBoundingClientRect().height + 130 > screenY
            ? pos.y - relPos.y
            : y,
      });
    }
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    onStart(e);
    e.preventDefault();
  }

  function onMouseUp(e) {
    setIsDragging(false);
    setTimeout(() => {
      setWasDragged(false);
    }, 1000);
    e.preventDefault();
  }

  function onMouseMove(e) {
    onMove(e);
    e.preventDefault();
  }

  function onTouchStart(e) {
    onStart(e.touches[0]);
    document.addEventListener("touchmove", onTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    // e.preventDefault();
  }

  function onTouchMove(e) {
    onMove(e.touches[0]);
    e.preventDefault();
  }

  function onTouchEnd(e) {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    setIsDragging(false);
    // e.preventDefault();
  }

  // When the element mounts, attach an mousedown listener
  useEffect(() => {
    ref.current?.addEventListener("mousedown", onMouseDown);
    ref.current?.addEventListener("touchstart", onTouchStart);

    return () => {
      ref.current?.removeEventListener("mousedown", onMouseDown);
      ref.current?.removeEventListener("touchstart", onTouchStart);
    };
  }, [ref.current]);

  // Everytime the isDragging state changes, assign or remove
  // the corresponding mousemove and mouseup handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("mousemove", onMouseMove);

      document.addEventListener("touchmove", onTouchMove);
      document.addEventListener("touchend", onTouchEnd);
    } else {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);

      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    }
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);

      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  return { ref, x: pos.x, y: pos.y, isDragging, wasDragged };
}

export default useDragging;
