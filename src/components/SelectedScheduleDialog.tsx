import { useEffect, useRef } from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import type { Session } from "../types";

export function SelectedScheduleDialog({ sessions, conflictIds, onClose }: {
  sessions: readonly Session[];
  conflictIds: ReadonlySet<string>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const orderedSessions = [...sessions].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (!returnFocusRef.current && previousFocus instanceof HTMLElement && !dialog?.contains(previousFocus)) {
      returnFocusRef.current = previousFocus;
    }
    const previousOverflow = document.body.style.overflow;
    const shell = dialog?.closest<HTMLElement>(".app-shell");
    const shellStyle = shell && getComputedStyle(shell);
    const scrollContainer = shell && /auto|scroll/.test(shellStyle?.overflowY || shellStyle?.overflow || "") ? shell : null;
    const containerOverflow = scrollContainer?.style.overflow ?? "";
    const containerTop = scrollContainer?.scrollTop ?? 0;
    const containerLeft = scrollContainer?.scrollLeft ?? 0;
    const { scrollX, scrollY } = window;
    document.body.style.overflow = "hidden";
    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      if (scrollContainer) {
        scrollContainer.style.overflow = containerOverflow;
        scrollContainer.scrollTop = containerTop;
        scrollContainer.scrollLeft = containerLeft;
      }
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus({ preventScroll: true });
      }
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  return (
    <dialog
      id="selected-schedule-dialog"
      className="schedule-review"
      ref={dialogRef}
      aria-labelledby="selected-schedule-title"
      aria-describedby="selected-schedule-count"
      onClose={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <header className="schedule-review__heading">
        <div>
          <Text as="h2" id="selected-schedule-title" textStyle="t6Bold">{t("schedule.reviewTitle")}</Text>
          <p id="selected-schedule-count">{t("schedule.selectedCount", { count: sessions.length })}</p>
        </div>
        <ActionButton ref={closeRef} variant="brandOutline" size="medium" type="button" onClick={onClose}>
          {t("schedule.reviewClose")}
        </ActionButton>
      </header>
      <div className="schedule-review__content">
        {orderedSessions.length === 0 ? (
          <p role="status">{t("schedule.reviewEmpty")}</p>
        ) : (
          <ol className="schedule-review__list">
            {orderedSessions.map((session) => (
              <li className="schedule-review__session" key={session.id}>
                <div className="schedule-review__time">
                  <time dateTime={session.startsAt}>{session.startTime}</time>
                  <span aria-hidden="true">–</span>
                  <time dateTime={session.endsAt}>{session.endTime}</time>
                </div>
                <div className="schedule-review__details">
                  <div className="schedule-review__tags">
                    {session.tags.map((tag) => (
                      <Badge className="schedule-review__badge" key={tag} tone="neutral" variant="weak" size="medium">
                        {tag}
                      </Badge>
                    ))}
                    {conflictIds.has(session.id) && (
                      <Badge className="schedule-review__badge" tone="critical" variant="weak" size="medium">
                        {t("session.conflict")}
                      </Badge>
                    )}
                  </div>
                  <Text as="h3" textStyle="t4Bold">{session.title}</Text>
                  {session.speaker && <p className="schedule-review__speaker">{session.speaker}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </dialog>
  );
}
