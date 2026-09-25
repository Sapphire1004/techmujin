import type { EventSchedule, Session } from "../types";

const IMAGE_WIDTH = 1_080;
const PAGE_PADDING = 72;
const CARD_GAP = 24;
const CARD_PADDING = 36;
const CARD_RADIUS = 28;
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif';

type ImageLabels = {
  scheduleTitle: string;
  sessionCount: string;
  speaker: string;
  trackA: string;
  trackB: string;
  allTracks: string;
};

type CreateScheduleImageOptions = {
  event: EventSchedule;
  sessions: Session[];
  labels: ImageLabels;
};

export type ScheduleImageFile = {
  blob: Blob;
  fileName: string;
  mimeType: "image/png";
  width: number;
  height: number;
};

type ImagePalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  border: string;
  brand: string;
};

type SessionCardLayout = {
  session: Session;
  titleLines: string[];
  speakerLines: string[];
  height: number;
};

function safeIdentifier(value: string) {
  return encodeURIComponent(value.toLowerCase())
    .replace(/%/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolvePalette(): ImagePalette {
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);

  const resolveColor = (variable: string, fallback: string) => {
    probe.style.color = fallback;
    probe.style.color = `var(${variable}, ${fallback})`;
    return getComputedStyle(probe).color || fallback;
  };

  const palette = {
    background: resolveColor("--tm-color-surface-muted", "#f4f4f2"),
    surface: resolveColor("--tm-color-surface", "#ffffff"),
    surfaceMuted: resolveColor("--tm-color-brand-weak", "#fff2e8"),
    text: resolveColor("--tm-color-text", "#171719"),
    muted: resolveColor("--tm-color-text-muted", "#6b6b70"),
    border: resolveColor("--tm-color-border", "#e5e5e5"),
    brand: resolveColor("--tm-color-brand", "#ff6f0f"),
  };

  probe.remove();
  return palette;
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (!text) return [];

  const segments = Array.from(
    new Intl.Segmenter(undefined, { granularity: "word" }).segment(text),
    ({ segment }) => segment,
  );
  const lines: string[] = [];
  let currentLine = "";

  const appendCharacters = (segment: string) => {
    for (const character of segment) {
      const candidate = `${currentLine}${character}`;
      if (currentLine && context.measureText(candidate).width > maxWidth) {
        lines.push(currentLine.trimEnd());
        currentLine = character.trimStart();
      } else {
        currentLine = candidate;
      }
    }
  };

  for (const segment of segments) {
    const candidate = `${currentLine}${segment}`;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine.trimEnd());
      currentLine = "";
    }

    if (context.measureText(segment).width <= maxWidth) {
      currentLine = segment.trimStart();
    } else {
      appendCharacters(segment);
    }
  }

  if (currentLine) lines.push(currentLine.trimEnd());
  return lines;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => {
    context.fillText(line, x, y + lineHeight * index);
  });
}

function trackLabel(trackId: Session["trackId"], labels: ImageLabels) {
  if (trackId === "track-a") return labels.trackA;
  if (trackId === "track-b") return labels.trackB;
  return labels.allTracks;
}

function createCardLayouts(
  context: CanvasRenderingContext2D,
  sessions: Session[],
  labels: ImageLabels,
) {
  const textWidth = IMAGE_WIDTH - PAGE_PADDING * 2 - CARD_PADDING * 2;

  return sessions.map<SessionCardLayout>((session) => {
    context.font = `700 36px ${FONT_FAMILY}`;
    const titleLines = wrapText(context, session.title, textWidth);
    context.font = `500 24px ${FONT_FAMILY}`;
    const speakerLines = session.speaker
      ? wrapText(
          context,
          `${labels.speaker} · ${session.speaker}`,
          textWidth,
        )
      : [];
    const height =
      CARD_PADDING * 2 +
      34 +
      22 +
      26 +
      22 +
      titleLines.length * 48 +
      (speakerLines.length > 0 ? 18 + speakerLines.length * 34 : 0);

    return { session, titleLines, speakerLines, height };
  });
}

function drawBadge(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  foreground: string,
  background: string,
) {
  context.font = `700 20px ${FONT_FAMILY}`;
  const width = context.measureText(label).width + 28;
  roundedRectangle(context, x, y, width, 36, 18);
  context.fillStyle = background;
  context.fill();
  context.fillStyle = foreground;
  context.textBaseline = "middle";
  context.fillText(label, x + 14, y + 19);
  context.textBaseline = "alphabetic";
  return width;
}

function drawSessionCard(
  context: CanvasRenderingContext2D,
  layout: SessionCardLayout,
  labels: ImageLabels,
  palette: ImagePalette,
  y: number,
) {
  const width = IMAGE_WIDTH - PAGE_PADDING * 2;
  const contentX = PAGE_PADDING + CARD_PADDING;
  const { session } = layout;

  roundedRectangle(context, PAGE_PADDING, y, width, layout.height, CARD_RADIUS);
  context.fillStyle = palette.surface;
  context.fill();
  context.strokeStyle = palette.border;
  context.lineWidth = 2;
  context.stroke();

  let cursorY = y + CARD_PADDING + 26;
  context.fillStyle = palette.text;
  context.font = `800 28px ${FONT_FAMILY}`;
  context.fillText(`${session.startTime}–${session.endTime}`, contentX, cursorY);

  const currentTrack = trackLabel(session.trackId, labels);
  context.font = `700 20px ${FONT_FAMILY}`;
  context.fillStyle = palette.muted;
  context.textAlign = "right";
  context.fillText(currentTrack, IMAGE_WIDTH - PAGE_PADDING - CARD_PADDING, cursorY);
  context.textAlign = "left";

  cursorY += 56;
  let badgeX = contentX;
  for (const tag of session.tags) {
    const badgeWidth = drawBadge(
      context,
      tag,
      badgeX,
      cursorY - 24,
      palette.brand,
      palette.surfaceMuted,
    );
    badgeX += badgeWidth + 10;
  }

  cursorY += 60;
  context.fillStyle = palette.text;
  context.font = `700 36px ${FONT_FAMILY}`;
  drawTextLines(context, layout.titleLines, contentX, cursorY, 48);
  cursorY += layout.titleLines.length * 48;

  if (layout.speakerLines.length > 0) {
    cursorY += 18;
    context.fillStyle = palette.muted;
    context.font = `500 24px ${FONT_FAMILY}`;
    drawTextLines(context, layout.speakerLines, contentX, cursorY, 34);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create schedule image"));
    }, "image/png");
  });
}

export async function createScheduleImageFile({
  event,
  sessions,
  labels,
}: CreateScheduleImageOptions): Promise<ScheduleImageFile> {
  if (sessions.length === 0) {
    throw new Error("At least one session is required");
  }

  await document.fonts?.ready;

  const sortedSessions = sessions
    .slice()
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = 1;
  const measureContext = canvas.getContext("2d");

  if (!measureContext) throw new Error("Canvas is unavailable");

  const headerHeight = 330;
  const footerHeight = 100;
  const layouts = createCardLayouts(measureContext, sortedSessions, labels);
  const cardsHeight = layouts.reduce(
    (total, layout) => total + layout.height,
    CARD_GAP * Math.max(0, layouts.length - 1),
  );
  const imageHeight = headerHeight + cardsHeight + footerHeight;

  canvas.height = imageHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const palette = resolvePalette();
  context.fillStyle = palette.background;
  context.fillRect(0, 0, IMAGE_WIDTH, imageHeight);

  context.fillStyle = palette.brand;
  context.fillRect(PAGE_PADDING, 64, 72, 8);
  context.font = `800 22px ${FONT_FAMILY}`;
  context.fillText("TECHMUJIN EVENT", PAGE_PADDING, 116);

  context.fillStyle = palette.text;
  context.font = `800 52px ${FONT_FAMILY}`;
  context.fillText(labels.scheduleTitle, PAGE_PADDING, 190);

  context.fillStyle = palette.muted;
  context.font = `500 25px ${FONT_FAMILY}`;
  context.fillText(
    `${event.dateLabel} · ${event.title}`,
    PAGE_PADDING,
    238,
  );
  drawBadge(
    context,
    labels.sessionCount,
    PAGE_PADDING,
    264,
    palette.brand,
    palette.surfaceMuted,
  );

  let cardY = headerHeight;
  layouts.forEach((layout) => {
    drawSessionCard(context, layout, labels, palette, cardY);
    cardY += layout.height + CARD_GAP;
  });

  context.fillStyle = palette.muted;
  context.font = `600 20px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.fillText(
    "TECHMUJIN · MY SCHEDULE",
    IMAGE_WIDTH / 2,
    imageHeight - 44,
  );
  context.textAlign = "left";

  const blob = await canvasToBlob(canvas);
  const filePrefix = safeIdentifier(event.id) || "techmujin";
  return {
    blob,
    fileName: `${filePrefix}-${event.dateLabel}-my-schedule.png`,
    mimeType: "image/png",
    width: IMAGE_WIDTH,
    height: imageHeight,
  };
}

export function downloadScheduleImageFile(imageFile: ScheduleImageFile) {
  const objectUrl = URL.createObjectURL(imageFile.blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = imageFile.fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
