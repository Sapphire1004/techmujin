import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import {
  createCalendarFile,
  downloadCalendarFile,
  isAppleMobileDevice,
  isShareCancellation,
  openCalendarFileForImport,
  shareCalendarFile,
  supportsCalendarFileShare,
} from "./calendar/ics";
import {
  createScheduleImageFile,
  downloadScheduleImageFile,
} from "./calendar/image";
import { useSavedSchedule } from "./hooks/useSavedSchedule";
import { useTimetable } from "./hooks/useTimetable";
import {
  isI18nEnabled,
  languageOptions,
  saveLanguage,
  type SupportedLanguage,
} from "./i18n";
import type { ScheduleData, Session } from "./types";

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function sessionsOverlap(first: Session, second: Session) {
  if (first.id === second.id) {
    return false;
  }

  return (
    toMinutes(first.startTime) < toMinutes(second.endTime) &&
    toMinutes(second.startTime) < toMinutes(first.endTime)
  );
}

function Timetable({ schedule }: { schedule: ScheduleData }) {
  const { t, i18n } = useTranslation();
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [imageExportStatus, setImageExportStatus] = useState<
    "idle" | "creating" | "error"
  >("idle");
  const [calendarExportStatus, setCalendarExportStatus] = useState<
    "idle" | "sharing" | "fallback"
  >("idle");
  const [canShareCalendarFile] = useState(supportsCalendarFileShare);
  const [canOpenAppleCalendar] = useState(isAppleMobileDevice);
  const { selectedSet, storageStatus, toggleSession } = useSavedSchedule();
  const { eventSchedule, sessions } = schedule;

  const timeBoundaries = useMemo(
    () =>
      Array.from(
        new Set([
          eventSchedule.startTime,
          eventSchedule.endTime,
          ...sessions.flatMap(({ startTime, endTime }) => [startTime, endTime]),
        ]),
      ).sort((first, second) => toMinutes(first) - toMinutes(second)),
    [eventSchedule.endTime, eventSchedule.startTime, sessions],
  );
  const boundaryIndexes = useMemo(
    () => new Map(timeBoundaries.map((time, index) => [time, index])),
    [timeBoundaries],
  );
  const timeBoundarySet = useMemo(() => new Set(timeBoundaries), [timeBoundaries]);
  const timeRanges = useMemo(
    () =>
      timeBoundaries.slice(0, -1).map((startTime, index) => ({
        startTime,
        endTime: timeBoundaries[index + 1],
      })),
    [timeBoundaries],
  );
  const slotCount = timeRanges.length;
  const timeSlots = timeRanges.map(({ startTime }) => startTime);

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
    () =>
      sessions
        .filter((session) => !showSavedOnly || selectedSet.has(session.id))
        .sort((first, second) => first.startTime.localeCompare(second.startTime)),
    [selectedSet, sessions, showSavedOnly],
  );
  const visibleSessionCount = visibleSessions.filter(
    (session) => session.format !== "break",
  ).length;
  const savedColumnCount = conflictIds.size > 0 ? 2 : 1;
  const gridTrackCount = showSavedOnly ? savedColumnCount : 1;

  const gridStyle = {
    "--track-count": gridTrackCount,
    "--slot-count": slotCount,
  } as CSSProperties;

  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    document.title = t("meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"));
  }, [currentLanguage, t]);

  const changeLanguage = (language: SupportedLanguage) => {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  };

  const exportSelectedSessionsCalendar = async () => {
    if (selectedSessions.length === 0 || calendarExportStatus === "sharing") {
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
        <div className="masthead__issue">
          <span>TECHMUJIN EVENT</span>
          <div className="masthead__controls">
            <span>
              {eventSchedule.startTime}–{eventSchedule.endTime} · {t("hero.oneDay")}
            </span>
            {isI18nEnabled && (
              <div
                className="language-switch"
                role="group"
                aria-label={t("language.selector")}
              >
                {languageOptions.map(({ code, label }) => (
                  <button
                    className="language-switch__button"
                    data-active={currentLanguage === code}
                    type="button"
                    key={code}
                    aria-pressed={currentLanguage === code}
                    onClick={() => changeLanguage(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Text as="h1" textStyle="screenTitle">
          {t("hero.title")}
        </Text>
        <Text
          as="p"
          className="masthead__note"
          color="fg.neutralMuted"
          textStyle="t4Regular"
        >
          {t("hero.note")}
        </Text>
        <div className="masthead__rule" aria-hidden="true" />
      </header>

      <main>
        <ActionButton
          className="saved-filter"
          variant={showSavedOnly ? "brandSolid" : "brandOutline"}
          size="small"
          type="button"
          aria-pressed={showSavedOnly}
          onClick={() => setShowSavedOnly((current) => !current)}
        >
          {t("filters.mySchedule", { count: selectedSessions.length })}
        </ActionButton>

        {storageStatus === "unavailable" && (
          <p className="storage-warning" role="status">
            {t("storage.unavailable")}
          </p>
        )}

        <section className="schedule" aria-labelledby="schedule-heading">
          <div className="schedule-heading">
            <div>
              <Text as="h2" id="schedule-heading" textStyle="t8Bold">
                {t("schedule.title")}
              </Text>
            </div>
            <div className="schedule-heading__summary">
              <Text
                as="p"
                aria-live="polite"
                color="fg.neutralMuted"
                textStyle="t3Regular"
              >
                {t("schedule.stats", {
                  visible: visibleSessionCount,
                  saved: selectedSessions.length,
                })}
              </Text>
              {showSavedOnly && (
                <div className="schedule-export">
                  <div className="schedule-export__actions">
                    {canOpenAppleCalendar && (
                      <ActionButton
                        variant="brandSolid"
                        size="small"
                        type="button"
                        disabled={selectedSessions.length === 0}
                        title={
                          selectedSessions.length === 0
                            ? t("calendar.noSessions")
                            : undefined
                        }
                        onClick={openSelectedSessionsInAppleCalendar}
                      >
                        {t("calendar.openApple")}
                      </ActionButton>
                    )}
                    <ActionButton
                      variant={
                        canOpenAppleCalendar ? "brandOutline" : "brandSolid"
                      }
                      size="small"
                      type="button"
                      disabled={
                        selectedSessions.length === 0 ||
                        calendarExportStatus === "sharing"
                      }
                      title={
                        selectedSessions.length === 0
                          ? t("calendar.noSessions")
                          : undefined
                      }
                      onClick={() => void exportSelectedSessionsCalendar()}
                    >
                      {calendarExportStatus === "sharing"
                        ? t("calendar.sharing")
                        : canShareCalendarFile
                          ? t("calendar.share")
                          : t("calendar.download")}
                    </ActionButton>
                    <ActionButton
                      variant="brandOutline"
                      size="small"
                      type="button"
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
                  {imageExportStatus === "error" && (
                    <p className="schedule-export__error" role="alert">
                      {t("calendar.imageError")}
                    </p>
                  )}
                  {calendarExportStatus === "fallback" && (
                    <p className="schedule-export__notice" role="status">
                      {t("calendar.shareFallback")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {visibleSessions.length > 0 ? (
            <div
              className="timetable-scroll"
              role="region"
              aria-label={t("schedule.regionLabel")}
              tabIndex={0}
            >
              <div
                className="timetable-grid"
                data-has-conflicts={showSavedOnly && conflictIds.size > 0}
                data-track-count={gridTrackCount}
                data-view={showSavedOnly ? "saved" : "all"}
                style={gridStyle}
              >
                <div className="time-corner">{t("schedule.time")}</div>

                {showSavedOnly ? (
                  <div
                    className="track-heading track-heading--saved"
                    style={{ gridColumn: "2 / -1", gridRow: 1 }}
                  >
                    <Text as="strong" textStyle="t5Bold">
                      {t("schedule.mySchedule")}
                    </Text>
                    <Text color="fg.neutralMuted" textStyle="t2Regular">
                      {t("schedule.selectedCount", {
                        count: selectedSessions.length,
                      })}
                    </Text>
                  </div>
                ) : (
                  <div
                    className="track-heading track-heading--saved"
                    style={{ gridColumn: 2, gridRow: 1 }}
                  >
                    <Text as="strong" textStyle="t5Bold">
                      {t("schedule.program")}
                    </Text>
                  </div>
                )}

                {timeSlots.map((time, index) => (
                  <div
                    className="time-gridline"
                    data-marker={timeBoundarySet.has(time)}
                    key={time}
                    style={{ gridRow: index + 2 }}
                  />
                ))}

                {timeRanges.map(({ startTime, endTime }) => {
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

                  return (
                    <button
                      className="session-block"
                      data-compact={isCompact}
                      data-conflict={hasConflict}
                      data-format={session.format}
                      data-state={isSelected ? "success" : "default"}
                      type="button"
                      key={session.id}
                      aria-pressed={isBreak ? undefined : isSelected}
                      aria-label={
                        isBreak
                          ? t("session.breakLabel", {
                              start: session.startTime,
                              end: session.endTime,
                              title: sessionTitle,
                            })
                          : t("session.cardLabel", {
                              start: session.startTime,
                              end: session.endTime,
                              title: sessionTitle,
                              action: t(
                                isSelected ? "session.remove" : "session.add",
                              ),
                              conflict: hasConflict
                                ? t("session.conflictSuffix")
                                : "",
                            })
                      }
                      disabled={isBreak}
                      style={{
                        gridColumn,
                        gridRow: `${startSlot + 2} / ${endSlot + 2}`,
                      }}
                      onClick={isBreak ? undefined : () => toggleSession(session.id)}
                    >
                      {isBreak ? (
                        <Text as="strong" maxLines={1} textStyle="t2Bold">
                          {sessionTitle}
                        </Text>
                      ) : (
                        <>
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
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{t("empty.title")}</h3>
              <p>{t("empty.body")}</p>
              <ActionButton
                className="reset-button"
                variant="neutralWeak"
                size="small"
                type="button"
                onClick={() => {
                  setShowSavedOnly(false);
                }}
              >
                {t("empty.reset")}
              </ActionButton>
            </div>
          )}
        </section>
      </main>

    </div>
  );
}

function App() {
  const { t } = useTranslation();
  const timetable = useTimetable();

  if (timetable.status === "loading") {
    return (
      <div className="app-shell app-shell--status">
        <div className="load-state" role="status">
          <Text as="p" color="fg.neutralMuted" textStyle="t4Regular">
            {t("api.loading")}
          </Text>
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

  return <Timetable schedule={timetable.data} />;
}

export default App;
