import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ActionButton, Badge, PageBanner, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import {
  createCalendarFile,
  downloadCalendarFile,
  isAppleMobileSafari,
  isMobileCalendarDevice,
  isShareCancellation,
  openCalendarFileForImport,
  shareCalendarFile,
  supportsCalendarFileShare,
} from "./calendar/ics";
import {
  createScheduleImageFile,
  downloadScheduleImageFile,
} from "./calendar/image";
import { VenueGuide } from "./components/VenueGuide";
import { SelectedScheduleDialog } from "./components/SelectedScheduleDialog";
import { createTimetableLayout, toMinutes } from "./timetable/layout";
import { useSavedSchedule } from "./hooks/useSavedSchedule";
import { useTimetable } from "./hooks/useTimetable";
import type { BoothsState } from "./hooks/useBooths";
import type { SupportedLanguage } from "./i18n";
import type { TimetableView } from "./navigation";
import type { ScheduleData, Session } from "./types";
import { StampRallyApp } from "./stamp-rally/StampRallyApp";

function sessionsOverlap(first: Session, second: Session) {
  if (first.id === second.id) {
    return false;
  }

  return (
    toMinutes(first.startTime) < toMinutes(second.endTime) &&
    toMinutes(second.startTime) < toMinutes(first.endTime)
  );
}

function Timetable({
  schedule,
  activeView,
  booths,
}: {
  schedule: ScheduleData;
  activeView: TimetableView;
  booths: BoothsState;
}) {
  const { t, i18n } = useTranslation();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [imageExportStatus, setImageExportStatus] = useState<
    "idle" | "creating" | "error"
  >("idle");
  const [calendarExportStatus, setCalendarExportStatus] = useState<
    "idle" | "sharing" | "fallback"
  >("idle");
  const [isMobileCalendar] = useState(isMobileCalendarDevice);
  const [canShareCalendarFile] = useState(
    () => isMobileCalendar && supportsCalendarFileShare(),
  );
  const [canOpenAppleCalendar] = useState(isAppleMobileSafari);
  const isCalendarUnsupported =
    isMobileCalendar && !canOpenAppleCalendar && !canShareCalendarFile;
  const { selectedSet, storageStatus, toggleSession, clearSchedule } = useSavedSchedule();
  const { eventSchedule, sessions } = schedule;

  const { ranges: timeRanges, boundaryIndexes } = useMemo(
    () => createTimetableLayout(eventSchedule, sessions),
    [eventSchedule, sessions],
  );
  const slotCount = timeRanges.length;

  const selectedSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.format !== "break" && selectedSet.has(session.id),
      ),
    [selectedSet, sessions],
  );

  const conflictIds = useMemo(() => {
    const conflicts = new Set<string>();

    selectedSessions.forEach((session, index) => {
      selectedSessions.slice(index + 1).forEach((candidate) => {
        if (sessionsOverlap(session, candidate)) {
          conflicts.add(session.id);
          conflicts.add(candidate.id);
        }
      });
    });

    return conflicts;
  }, [selectedSessions]);

  const visibleSessions = useMemo(
    () => [...sessions].sort((first, second) => first.startTime.localeCompare(second.startTime)),
    [sessions],
  );
  const gridTrackCount = 1;

  const gridStyle = {
    "--track-count": gridTrackCount,
    "--slot-count": slotCount,
    gridTemplateRows: ["var(--timetable-head)", ...timeRanges.map(({ isShortGap }) =>
      isShortGap ? "var(--timetable-transition)" : "var(--timetable-slot)")].join(" "),
  } as CSSProperties;

  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;

  useEffect(() => setIsReviewOpen(false), [activeView]);

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    const metaTitleKey =
      activeView === "program"
        ? "meta.title"
        : activeView === "access"
          ? "access.metaTitle"
          : "venue.metaTitle";
    const metaDescriptionKey =
      activeView === "program"
        ? "meta.description"
        : activeView === "access"
          ? "access.metaDescription"
          : "venue.metaDescription";
    document.title = t(metaTitleKey);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(metaDescriptionKey),
      );
  }, [activeView, currentLanguage, t]);

  const exportSelectedSessionsCalendar = async () => {
    if (
      selectedSessions.length === 0 ||
      calendarExportStatus === "sharing" ||
      isCalendarUnsupported
    ) {
      return;
    }

    const calendarFile = createCalendarFile({
      event: eventSchedule,
      sessions: selectedSessions,
    });

    if (!canShareCalendarFile) {
      downloadCalendarFile(calendarFile);
      return;
    }

    setCalendarExportStatus("sharing");

    try {
      await shareCalendarFile(calendarFile, eventSchedule.title);
      setCalendarExportStatus("idle");
    } catch (error) {
      if (isShareCancellation(error)) {
        setCalendarExportStatus("idle");
        return;
      }

      console.error("Failed to share calendar file", error);
      downloadCalendarFile(calendarFile);
      setCalendarExportStatus("fallback");
    }
  };

  const openSelectedSessionsInAppleCalendar = () => {
    if (selectedSessions.length === 0) return;

    openCalendarFileForImport(
      createCalendarFile({
        event: eventSchedule,
        sessions: selectedSessions,
      }),
    );
  };

  const downloadSelectedSessionsImage = async () => {
    if (selectedSessions.length === 0 || imageExportStatus === "creating") {
      return;
    }

    setImageExportStatus("creating");

    try {
      const imageFile = await createScheduleImageFile({
        event: eventSchedule,
        sessions: selectedSessions,
        labels: {
          scheduleTitle: t("schedule.mySchedule"),
          sessionCount: t("calendar.imageSessionCount", {
            count: selectedSessions.length,
          }),
          speaker: t("calendar.imageSpeaker"),
          trackA: t("calendar.trackA"),
          trackB: t("calendar.trackB"),
          allTracks: t("calendar.allTracks"),
          morning: t("calendar.morning"),
          afternoon: t("calendar.afternoon"),
        },
      });
      downloadScheduleImageFile(imageFile);
      setImageExportStatus("idle");
    } catch (error) {
      console.error("Failed to create schedule image", error);
      setImageExportStatus("error");
    }
  };

  return (
      <div className="app-shell">
        <header className="masthead">
          <Text as="h1" textStyle="screenTitle">
            {t(
              activeView === "program"
                ? "hero.title"
                : activeView === "access"
                  ? "access.heroTitle"
                  : "venue.heroTitle",
            )}
          </Text>
          <div className="masthead__utility-row">
            <Text
              as="p"
              className="masthead__note"
              color="fg.neutralMuted"
              textStyle="t4Regular"
            >
              {activeView === "program"
                ? t("hero.note", {
                    start: eventSchedule.startTime,
                    end: eventSchedule.endTime,
                  })
                : t(
                    activeView === "access"
                      ? "access.heroNote"
                      : "venue.heroNote",
                  )}
            </Text>

            {activeView === "program" && (
              <div className="schedule-utility">
                <div className="schedule-export">
                  <div className="schedule-export__toolbar">
                    <Text
                      as="p"
                      className="schedule-export__count"
                      color="fg.neutralMuted"
                      textStyle="t3Regular"
                      aria-live="polite"
                    >
                      {t("schedule.selectedCount", {
                        count: selectedSessions.length,
                      })}
                    </Text>
                    <div className="schedule-export__actions">
                      <ActionButton
                        className="schedule-export__button"
                        variant="brandSolid"
                        size="medium"
                        type="button"
                        loading={calendarExportStatus === "sharing"}
                        disabled={
                          selectedSessions.length === 0 ||
                          calendarExportStatus === "sharing" ||
                          isCalendarUnsupported
                        }
                        aria-label={
                          canOpenAppleCalendar ? t("calendar.openApple") : undefined
                        }
                        title={
                          selectedSessions.length === 0
                            ? t("calendar.noSessions")
                            : isCalendarUnsupported
                              ? t("calendar.unsupported")
                              : undefined
                        }
                        onClick={
                          canOpenAppleCalendar
                            ? openSelectedSessionsInAppleCalendar
                            : () => void exportSelectedSessionsCalendar()
                        }
                      >
                        {calendarExportStatus === "sharing"
                          ? t("calendar.sharing")
                          : canOpenAppleCalendar
                            ? t("calendar.add")
                            : isMobileCalendar
                              ? t("calendar.share")
                              : t("calendar.download")}
                      </ActionButton>
                      <ActionButton
                        className="schedule-export__button"
                        variant="brandOutline"
                        size="medium"
                        type="button"
                        loading={imageExportStatus === "creating"}
                        disabled={
                          selectedSessions.length === 0 ||
                          imageExportStatus === "creating"
                        }
                        title={
                          selectedSessions.length === 0
                            ? t("calendar.noSessions")
                            : undefined
                        }
                        onClick={() => void downloadSelectedSessionsImage()}
                      >
                        {imageExportStatus === "creating"
                          ? t("calendar.imageCreating")
                          : t("calendar.imageDownload")}
                      </ActionButton>
                    </div>
                    <ActionButton
                      className="schedule-export__button schedule-export__clear"
                      variant="brandOutline"
                      size="medium"
                      type="button"
                      aria-label={t("schedule.clearAll")}
                      disabled={selectedSessions.length === 0}
                      onClick={clearSchedule}
                    >
                      {t("schedule.clearAllButton")}
                    </ActionButton>
                  </div>
                  {imageExportStatus === "error" && (
                    <PageBanner.Root
                      className="schedule-export__feedback"
                      role="alert"
                      tone="critical"
                      variant="weak"
                    >
                      <PageBanner.Content>
                        <PageBanner.Body>
                          <PageBanner.Description>
                            {t("calendar.imageError")}
                          </PageBanner.Description>
                        </PageBanner.Body>
                      </PageBanner.Content>
                    </PageBanner.Root>
                  )}
                  {calendarExportStatus === "fallback" && (
                    <PageBanner.Root
                      className="schedule-export__feedback"
                      role="status"
                      tone="informative"
                      variant="weak"
                    >
                      <PageBanner.Content>
                        <PageBanner.Body>
                          <PageBanner.Description>
                            {t("calendar.shareFallback")}
                          </PageBanner.Description>
                        </PageBanner.Body>
                      </PageBanner.Content>
                    </PageBanner.Root>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {isReviewOpen && activeView === "program" && (
          <SelectedScheduleDialog
            sessions={selectedSessions}
            conflictIds={conflictIds}
            onClose={() => setIsReviewOpen(false)}
          />
        )}

        <main>

        <div
          id="program-panel"
          className="app-panel"
          hidden={activeView !== "program"}
        >
          <ActionButton
            className="schedule-review-trigger"
            variant="brandSolid"
            size="medium"
            type="button"
            aria-haspopup="dialog"
            aria-controls="selected-schedule-dialog"
            aria-expanded={isReviewOpen}
            disabled={selectedSessions.length === 0}
            onClick={() => setIsReviewOpen(true)}
          >
            {t("schedule.reviewButton", { count: selectedSessions.length })}
          </ActionButton>

          {storageStatus === "unavailable" && (
            <p className="storage-warning" role="status">
              {t("storage.unavailable")}
            </p>
          )}

          <section className="schedule" aria-label={t("schedule.regionLabel")}>
          {visibleSessions.length > 0 ? (
            <div
              className="timetable-scroll"
              role="region"
              aria-label={t("schedule.regionLabel")}
              tabIndex={0}
            >
              <div
                className="timetable-grid"
                data-track-count={gridTrackCount}
                style={gridStyle}
              >
                <div className="time-corner">{t("schedule.time")}</div>

                <div
                  className="track-heading track-heading--saved"
                  style={{ gridColumn: 2, gridRow: 1 }}
                >
                  <Text as="strong" textStyle="t5Bold">
                    {t("schedule.program")}
                  </Text>
                </div>

                {timeRanges.map(({ startTime, isShortGap }, index) => (
                  <div
                    className={isShortGap ? "time-transition" : "time-gridline"}
                    data-marker={!isShortGap}
                    aria-hidden="true"
                    key={startTime}
                    style={{ gridRow: index + 2 }}
                  />
                ))}

                {timeRanges.map(({ startTime, endTime, isShortGap }) => {
                  if (isShortGap) return null;
                  const startSlot = boundaryIndexes.get(startTime) ?? 0;
                  const endSlot = boundaryIndexes.get(endTime) ?? startSlot + 1;

                  return (
                    <div
                      className="time-range"
                      key={`${startTime}-${endTime}`}
                      style={{
                        gridColumn: 1,
                        gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                      }}
                    >
                      <time>
                        {startTime}–{endTime}
                      </time>
                    </div>
                  );
                })}

                {Array.from({ length: gridTrackCount }, (_, index) => (
                    <div
                      className="track-column-line"
                      aria-hidden="true"
                      key={`track-line-${index}`}
                      style={{
                        gridColumn: index + 2,
                        gridRow: `2 / ${slotCount + 2}`,
                      }}
                    />
                  ))}

                {visibleSessions.map((session) => {
                  const startSlot = boundaryIndexes.get(session.startTime) ?? 0;
                  const endSlot =
                    boundaryIndexes.get(session.endTime) ?? startSlot + 1;
                  const isSelected = selectedSet.has(session.id);
                  const hasConflict = conflictIds.has(session.id);
                  const isBreak = session.format === "break";
                  const isCompact =
                    toMinutes(session.endTime) - toMinutes(session.startTime) <= 10;
                  const sessionTitle = session.title;
                  const speakerName = session.speaker;
                  const gridColumn = "2 / -1";
                  const sessionLabel = isBreak
                    ? t("session.breakLabel", {
                        start: session.startTime,
                        end: session.endTime,
                        title: sessionTitle,
                      })
                    : t("session.cardLabel", {
                        start: session.startTime,
                        end: session.endTime,
                        title: sessionTitle,
                        action: t(isSelected ? "session.remove" : "session.add"),
                        conflict: hasConflict ? t("session.conflictSuffix") : "",
                      });

                  return (
                    <article
                      className="session-block"
                      data-compact={isCompact}
                      data-conflict={hasConflict}
                      data-format={session.format}
                      data-state={isSelected ? "success" : "default"}
                      key={session.id}
                      aria-label={isBreak ? sessionLabel : undefined}
                      style={{
                        gridColumn,
                        gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                      }}
                    >
                      {isBreak ? (
                        <Text as="strong" maxLines={1} textStyle="t2Bold">
                          {sessionTitle}
                        </Text>
                      ) : (
                        <>
                          <button
                            className="session-block__content"
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={sessionLabel}
                            onClick={() => toggleSession(session.id)}
                          >
                            <span className="session-block__tags">
                              {session.tags.map((tag) => (
                                <Badge
                                  className="session-block__badge"
                                  key={tag}
                                  size="medium"
                                  tone="neutral"
                                  variant="weak"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {hasConflict ? (
                                <Badge
                                  className="session-block__badge"
                                  size="medium"
                                  tone="critical"
                                  variant="weak"
                                >
                                  {t("session.conflict")}
                                </Badge>
                              ) : isSelected ? (
                                <Badge
                                  className="session-block__badge"
                                  size="medium"
                                  tone="brand"
                                  variant="weak"
                                >
                                  {t("session.selected")}
                                </Badge>
                              ) : null}
                            </span>
                            <Text as="strong" maxLines={2} textStyle="t3Bold">
                              {sessionTitle}
                            </Text>
                            {session.speaker && (
                              <span className="session-block__speaker">
                                {session.speakerImage ? (
                                  <img
                                    className="session-block__avatar"
                                    src={session.speakerImage}
                                    alt=""
                                    width={24}
                                    height={24}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <span
                                    className="session-block__avatar session-block__avatar--fallback"
                                    aria-hidden="true"
                                  >
                                    {speakerName.slice(0, 1)}
                                  </span>
                                )}
                                <Text
                                  className="session-block__speaker-name"
                                  color="fg.neutralMuted"
                                  maxLines={1}
                                  textStyle="t2Regular"
                                >
                                  {speakerName}
                                </Text>
                              </span>
                            )}
                          </button>
                          <ActionButton
                            className="session-block__action"
                            variant={isSelected ? "brandSolid" : "brandOutline"}
                            size="small"
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={sessionLabel}
                            onClick={() => toggleSession(session.id)}
                          >
                            <span aria-hidden="true">{isSelected ? "✓" : "＋"}</span>
                            {t(isSelected ? "session.addedButton" : "session.addButton")}
                          </ActionButton>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{t("empty.title")}</h3>
              <p>{t("empty.body")}</p>
            </div>
          )}
          </section>
        </div>

        <div
          id="access-panel"
          className="app-panel"
          hidden={activeView !== "access"}
        >
          <VenueGuide view="access" booths={booths} />
        </div>

        <div
          id="venue-panel"
          className="app-panel"
          hidden={activeView !== "venue"}
        >
          <VenueGuide view="interior" booths={booths} />
        </div>
        </main>
      </div>
  );
}

function TimetableRoute({ activeView, booths }: { activeView: TimetableView; booths: BoothsState }) {
  const { t } = useTranslation();
  const timetable = useTimetable();

  if (timetable.status === "loading") {
    return (
      <div className="app-shell app-shell--status">
        <div className="load-state" role="status" aria-live="polite">
          <Text as="p" color="fg.neutralMuted" textStyle="t4Regular">
            {t("api.loading")}
          </Text>
          <div className="load-state__skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (timetable.status === "error") {
    return (
      <div className="app-shell app-shell--status">
        <div className="load-state" role="alert">
          <Text as="h1" textStyle="t7Bold">
            {t("api.error")}
          </Text>
          <ActionButton
            variant="brandSolid"
            size="small"
            type="button"
            onClick={timetable.retry}
          >
            {t("api.retry")}
          </ActionButton>
        </div>
      </div>
    );
  }

  return <Timetable schedule={timetable.data} activeView={activeView} booths={booths} />;
}

function App() {
  return (
    <StampRallyApp
      renderTimetable={(activeView, booths) => <TimetableRoute activeView={activeView} booths={booths} />}
    />
  );
}

export default App;
