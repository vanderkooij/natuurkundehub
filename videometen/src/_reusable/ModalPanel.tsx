/**
 * @reusable
 * @category ui
 * @description Generieke modal-overlay voor help-, info- of preview-panelen.
 *   Backdrop-blur, gecentreerde card met max-width/-height + scrollable body,
 *   sluit via X-knop, klik op backdrop of `Escape`. Body krijgt een slot — de
 *   consumer levert de inhoud. Geen accordion of andere widgets ingebouwd:
 *   de inhouds-component bepaalt dat zelf.
 *
 *   Toegankelijkheid: `role="dialog"`, `aria-modal`, gericht op de close-knop
 *   bij open, ESC-toets respect, en focus-trap (lichte versie — body krijgt
 *   `tabindex={-1}` wat scroll-via-keyboard mogelijk maakt).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ModalPanelProps {
  isOpen: boolean;
  title: ReactNode;
  /** Optionele extra inhoud rechts in de header (bv. versie-info). */
  headerActions?: ReactNode;
  /** Optionele footer onder de scrollable body. */
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind-class voor max-breedte. Default `max-w-3xl`. */
  maxWidthClass?: string;
}

export function ModalPanel({
  isOpen,
  title,
  headerActions,
  footer,
  onClose,
  children,
  maxWidthClass = "max-w-3xl",
}: ModalPanelProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Escape sluit. Listener alleen actief tijdens open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Focus de close-knop bij open zodat keyboard-navigatie ergens begint.
  useEffect(() => {
    if (isOpen) closeBtnRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      // 09c: zelfde large-vs-visual-viewport-valstrik als de shadcn-Dialog. Een
      // `fixed inset-0` flex-container krijgt zijn maten van het *initial
      // containing block* (de "large" viewport, op mobiel/dev-tools groter dan
      // zichtbaar) — zowel `bottom:0` (hoogte) als `right:0` (breedte). Dan
      // centreert `items-center`/`justify-center` de card buiten het zichtbare
      // gebied. Fix: maten aan het ZICHTBARE gebied koppelen via dynamic-
      // viewport-units `h-dvh`/`w-dvw` i.p.v. de inset-randen.
      className="fixed left-0 top-0 z-50 flex h-dvh w-dvw items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — klik buiten de card sluit. */}
      <button
        type="button"
        aria-label="Sluit"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      {/* Card */}
      <div
        className={cn(
          "relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-[14px] border bg-(--bg-card) shadow-2xl",
          maxWidthClass,
        )}
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-[15px] font-semibold text-(--text-primary)">{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Sluit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-(--text-muted) hover:border-(--accent) hover:text-(--accent)"
              style={{ borderColor: "var(--border-solid)" }}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto" tabIndex={-1}>
          {children}
        </div>
        {footer ? (
          <div
            className="flex-shrink-0 border-t bg-(--bg-secondary) px-5 py-2 text-[12px] text-(--text-muted)"
            style={{ borderColor: "var(--border)" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
