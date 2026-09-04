import { useEffect, useRef } from "react";

export function Dialog({ open, onClose, labelledBy, className = "", children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = previous; previousFocus?.focus(); };
  }, [open]);
  if (!open) return null;
  return <dialog ref={ref} className={className} aria-labelledby={labelledBy}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onMouseDown={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose();
    }}>{children}</dialog>;
}
