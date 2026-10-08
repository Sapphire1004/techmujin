import type { EventSchedule, Session } from "../types";

export const CALENDAR_MIME_TYPE = "text/calendar;charset=utf-8";
const CALENDAR_SHARE_MIME_TYPE = "text/calendar";

export type CalendarFile = {
  contents: string;
  fileName: string;
  mimeType: typeof CALENDAR_MIME_TYPE;
};

type AppleDeviceInfo = Pick<
  Navigator,
  "maxTouchPoints" | "platform" | "userAgent"
>;

type CreateCalendarFileOptions = {
  event: EventSchedule;
  sessions: Session[];
  generatedAt?: Date;
};

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatUtcDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid calendar date");
  }

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line: string) {
  const encoder = new TextEncoder();
  const foldedLines: string[] = [];
  let currentLine = "";
  let currentBytes = 0;

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;

    if (currentLine && currentBytes + characterBytes > 75) {
      foldedLines.push(currentLine);
      currentLine = ` ${character}`;
      currentBytes = 1 + characterBytes;
      continue;
    }

    currentLine += character;
    currentBytes += characterBytes;
  }

  foldedLines.push(currentLine);
  return foldedLines.join("\r\n");
}

function safeIdentifier(value: string) {
  return encodeURIComponent(value.toLowerCase())
    .replace(/%/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function trackLabel(trackId: Session["trackId"]) {
  if (trackId === "track-a") return "トラック A";
  if (trackId === "track-b") return "トラック B";
  return "全トラック";
}

function createDescription(session: Session) {
  return [
    session.speaker ? `登壇者: ${session.speaker}` : null,
    `トラック: ${trackLabel(session.trackId)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function createLocation(event: EventSchedule, session: Session) {
  return [event.venue, trackLabel(session.trackId)].filter(Boolean).join(" · ");
}

function createEventLines(
  event: EventSchedule,
  session: Session,
  timestamp: string,
) {
  const eventId = safeIdentifier(event.id) || "techmujin-event";
  const sessionId = safeIdentifier(session.id) || "session";
  const location = createLocation(event, session);

  return [
    "BEGIN:VEVENT",
    `UID:${eventId}-${sessionId}@timetable.techmujin`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${formatUtcDateTime(session.startsAt)}`,
    `DTEND:${formatUtcDateTime(session.endsAt)}`,
    `SUMMARY:${escapeText(session.title)}`,
    `DESCRIPTION:${escapeText(createDescription(session))}`,
    location ? `LOCATION:${escapeText(location)}` : null,
    session.tags.length > 0
      ? `CATEGORIES:${session.tags.map(escapeText).join(",")}`
      : null,
    event.url ? `URL:${event.url}` : null,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ].filter((line): line is string => line !== null);
}

export function createCalendarFile({
  event,
  sessions,
  generatedAt = new Date(),
}: CreateCalendarFileOptions): CalendarFile {
  if (sessions.length === 0) {
    throw new Error("At least one session is required");
  }

  const timestamp = formatUtcDateTime(generatedAt);
  const calendarName = `${event.title} マイスケジュール`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TechMujin//Timetable//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${escapeText(event.timezone)}`,
    ...sessions
      .slice()
      .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
      .flatMap((session) => createEventLines(event, session, timestamp)),
    "END:VCALENDAR",
  ];

  const filePrefix = safeIdentifier(event.id) || "techmujin";
  return {
    contents: `${lines.map(foldLine).join("\r\n")}\r\n`,
    fileName: `${filePrefix}-${event.dateLabel}-my-schedule.ics`,
    mimeType: CALENDAR_MIME_TYPE,
  };
}

export function downloadCalendarFile(calendarFile: CalendarFile) {
  const blob = new Blob([calendarFile.contents], {
    type: calendarFile.mimeType,
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = calendarFile.fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export function isAppleMobileDevice(deviceInfo?: AppleDeviceInfo) {
  const device =
    deviceInfo ?? (typeof navigator === "undefined" ? null : navigator);

  if (!device) return false;

  const isClassicAppleMobile = /iPad|iPhone|iPod/.test(device.userAgent);
  const isIPadWithDesktopUserAgent =
    device.platform === "MacIntel" && device.maxTouchPoints > 1;

  return isClassicAppleMobile || isIPadWithDesktopUserAgent;
}

export function isAppleMobileSafari(deviceInfo?: AppleDeviceInfo) {
  const device =
    deviceInfo ?? (typeof navigator === "undefined" ? null : navigator);

  if (!device || !isAppleMobileDevice(device)) return false;

  const userAgent = device.userAgent;
  const isSafari = /Version\/[\d.]+.*Safari\//.test(userAgent);
  const isOtherIosBrowser =
    /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Ddg\/|GSA\//.test(userAgent);

  return isSafari && !isOtherIosBrowser;
}

export function openCalendarFileForImport(calendarFile: CalendarFile) {
  const file = createCalendarShareFile(calendarFile);
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function createCalendarShareFile(calendarFile: CalendarFile) {
  return new File([calendarFile.contents], calendarFile.fileName, {
    type: CALENDAR_SHARE_MIME_TYPE,
  });
}

export function supportsCalendarFileShare() {
  if (
    typeof navigator === "undefined" ||
    typeof File === "undefined" ||
    navigator.maxTouchPoints <= 0 ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    const testFile = new File([""], "schedule.ics", {
      type: CALENDAR_SHARE_MIME_TYPE,
    });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export async function shareCalendarFile(
  calendarFile: CalendarFile,
  title: string,
) {
  const file = createCalendarShareFile(calendarFile);

  if (
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    !navigator.canShare({ files: [file] })
  ) {
    throw new Error("Calendar file sharing is not supported");
  }

  await navigator.share({
    files: [file],
    title,
  });
}

export function isShareCancellation(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
