import type { EventSchedule, Session } from "../types";

const IMAGE_WIDTH = 720;
const PAGE_PADDING = 32;
const COLUMN_GAP = 14;
const CARD_GAP = 14;
const SECTION_HEADER_HEIGHT = 48;
const SECTION_GAP = 20;
const COMPACT_LAYOUT_MINIMUM = 9;
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif';

type ImageLabels = {
  scheduleTitle: string;
  sessionCount: string;
  speaker: string;
  trackA: string;
  trackB: string;
  allTracks: string;
  morning: string;
  afternoon: string;
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

type ImageSection = {
  label: string;
  rows: SessionCardLayout[][];
  rowHeights: number[];
  height: number;
};

type LayoutMetrics = {
  cardPadding: number;
  cardRadius: number;
  timeFontSize: number;
  trackFontSize: number;
  badgeFontSize: number;
  badgeHeight: number;
  titleFontSize: number;
  titleLineHeight: number;
  speakerFontSize: number;
  speakerLineHeight: number;
};

const detailedMetrics: LayoutMetrics = {
  cardPadding: 24,
  cardRadius: 20,
  timeFontSize: 22,
  trackFontSize: 16,
  badgeFontSize: 15,
  badgeHeight: 28,
  titleFontSize: 28,
  titleLineHeight: 38,
  speakerFontSize: 18,
  speakerLineHeight: 25,
};

const compactMetrics: LayoutMetrics = {
  cardPadding: 18,
  cardRadius: 16,
  timeFontSize: 18,
  trackFontSize: 13,
  badgeFontSize: 13,
  badgeHeight: 24,
  titleFontSize: 22,
  titleLineHeight: 30,
  speakerFontSize: 15,
  speakerLineHeight: 21,
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

function isMorning(session: Session) {
  return session.startTime < "12:00";
}

function createSection(
  label: string,
  layouts: SessionCardLayout[],
  columnCount: number,
): ImageSection | null {
  if (layouts.length === 0) return null;

  const rows = Array.from(
    { length: Math.ceil(layouts.length / columnCount) },
    (_, rowIndex) =>
      layouts.slice(rowIndex * columnCount, (rowIndex + 1) * columnCount),
  );
  const rowHeights = rows.map((row) =>
    Math.max(...row.map(({ height }) => height)),
  );
  const cardsHeight = rowHeights.reduce(
    (total, height) => total + height,
    CARD_GAP * Math.max(0, rows.length - 1),
  );

  return {
    label,
    rows,
    rowHeights,
    height: SECTION_HEADER_HEIGHT + cardsHeight,
  };
}

function createCardLayouts(
  context: CanvasRenderingContext2D,
  sessions: Session[],
  labels: ImageLabels,
  cardWidth: number,
  metrics: LayoutMetrics,
) {
  const textWidth = cardWidth - metrics.cardPadding * 2;

  return sessions.map<SessionCardLayout>((session) => {
    context.font = `700 ${metrics.titleFontSize}px ${FONT_FAMILY}`;
    const titleLines = wrapText(context, session.title, textWidth);
    context.font = `500 ${metrics.speakerFontSize}px ${FONT_FAMILY}`;
    const speakerLines = session.speaker
      ? wrapText(
          context,
          `${labels.speaker} · ${session.speaker}`,
          textWidth,
        )
      : [];
    const height =
      metrics.cardPadding * 2 +
      metrics.timeFontSize +
      14 +
      metrics.badgeHeight +
      14 +
      titleLines.length * metrics.titleLineHeight +
      (speakerLines.length > 0
        ? 12 + speakerLines.length * metrics.speakerLineHeight
        : 0);

    return { session, titleLines, speakerLines, height };
  });
}

function drawBadge(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  metrics: LayoutMetrics,
  foreground: string,
  background: string,
) {
  context.font = `700 ${metrics.badgeFontSize}px ${FONT_FAMILY}`;
  const horizontalPadding = metrics.badgeFontSize;
  const width = context.measureText(label).width + horizontalPadding * 2;
  roundedRectangle(
    context,
    x,
    y,
    width,
    metrics.badgeHeight,
    metrics.badgeHeight / 2,
  );
  context.fillStyle = background;
  context.fill();
  context.fillStyle = foreground;
  context.textBaseline = "middle";
  context.fillText(
    label,
    x + horizontalPadding,
    y + metrics.badgeHeight / 2 + 1,
  );
  context.textBaseline = "alphabetic";
}

function drawSessionCard(
  context: CanvasRenderingContext2D,
  layout: SessionCardLayout,
  labels: ImageLabels,
  palette: ImagePalette,
  metrics: LayoutMetrics,
  x: number,
  y: number,
  width: number,
  showTrack: boolean,
) {
  const contentX = x + metrics.cardPadding;
  const { session } = layout;

  roundedRectangle(context, x, y, width, layout.height, metrics.cardRadius);
  context.fillStyle = palette.surface;
  context.fill();
  context.strokeStyle = palette.border;
  context.lineWidth = 1.5;
  context.stroke();

  let cursorY = y + metrics.cardPadding + metrics.timeFontSize;
  context.fillStyle = palette.text;
  context.font = `800 ${metrics.timeFontSize}px ${FONT_FAMILY}`;
  context.fillText(`${session.startTime}–${session.endTime}`, contentX, cursorY);

  if (showTrack) {
    context.font = `700 ${metrics.trackFontSize}px ${FONT_FAMILY}`;
    context.fillStyle = palette.muted;
    context.textAlign = "right";
    context.fillText(
      trackLabel(session.trackId, labels),
      x + width - metrics.cardPadding,
      cursorY,
    );
    context.textAlign = "left";
  }

  cursorY += 14;
  drawBadge(
    context,
    session.tags[0] ?? "",
    contentX,
    cursorY,
    metrics,
    palette.brand,
    palette.surfaceMuted,
  );

  cursorY += metrics.badgeHeight + 14 + metrics.titleFontSize;
  context.fillStyle = palette.text;
  context.font = `700 ${metrics.titleFontSize}px ${FONT_FAMILY}`;
  drawTextLines(
    context,
    layout.titleLines,
    contentX,
    cursorY,
    metrics.titleLineHeight,
  );
  cursorY += layout.titleLines.length * metrics.titleLineHeight;

  if (layout.speakerLines.length > 0) {
    cursorY += 12;
    context.fillStyle = palette.muted;
    context.font = `500 ${metrics.speakerFontSize}px ${FONT_FAMILY}`;
    drawTextLines(
      context,
      layout.speakerLines,
      contentX,
      cursorY,
      metrics.speakerLineHeight,
    );
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
  const compact = sortedSessions.length >= COMPACT_LAYOUT_MINIMUM;
  const columnCount = compact ? 2 : 1;
  const metrics = compact ? compactMetrics : detailedMetrics;
  const cardWidth =
    (IMAGE_WIDTH - PAGE_PADDING * 2 - COLUMN_GAP * (columnCount - 1)) /
    columnCount;
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = 1;
  const measureContext = canvas.getContext("2d");

  if (!measureContext) throw new Error("Canvas is unavailable");

  const headerHeight = 220;
  const footerHeight = 64;
  const layouts = createCardLayouts(
    measureContext,
    sortedSessions,
    labels,
    cardWidth,
    metrics,
  );
  const sections = [
    createSection(
      labels.morning,
      layouts.filter(({ session }) => isMorning(session)),
      columnCount,
    ),
    createSection(
      labels.afternoon,
      layouts.filter(({ session }) => !isMorning(session)),
      columnCount,
    ),
  ].filter((section): section is ImageSection => section !== null);
  const sectionsHeight = sections.reduce(
    (total, section) => total + section.height,
    SECTION_GAP * Math.max(0, sections.length - 1),
  );
  const imageHeight = Math.ceil(headerHeight + sectionsHeight + footerHeight);

  canvas.height = imageHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const palette = resolvePalette();
  context.fillStyle = palette.background;
  context.fillRect(0, 0, IMAGE_WIDTH, imageHeight);

  context.fillStyle = palette.brand;
  context.fillRect(PAGE_PADDING, 38, 48, 6);
  context.font = `800 16px ${FONT_FAMILY}`;
  context.fillText("TECHMUJIN EVENT", PAGE_PADDING, 76);

  context.fillStyle = palette.text;
  context.font = `800 36px ${FONT_FAMILY}`;
  context.fillText(labels.scheduleTitle, PAGE_PADDING, 126);

  context.fillStyle = palette.muted;
  context.font = `500 17px ${FONT_FAMILY}`;
  context.fillText(`${event.dateLabel} · ${event.title}`, PAGE_PADDING, 158);
  drawBadge(
    context,
    labels.sessionCount,
    PAGE_PADDING,
    176,
    detailedMetrics,
    palette.brand,
    palette.surfaceMuted,
  );

  const trackCount = new Set(sortedSessions.map(({ trackId }) => trackId)).size;
  const showTrack = trackCount > 1;
  let sectionY = headerHeight;

  sections.forEach((section, sectionIndex) => {
    context.fillStyle = palette.text;
    context.font = `800 22px ${FONT_FAMILY}`;
    context.fillText(section.label, PAGE_PADDING, sectionY + 29);
    const labelWidth = context.measureText(section.label).width;
    context.fillStyle = palette.border;
    context.fillRect(
      PAGE_PADDING + labelWidth + 16,
      sectionY + 20,
      IMAGE_WIDTH - PAGE_PADDING * 2 - labelWidth - 16,
      2,
    );

    let rowY = sectionY + SECTION_HEADER_HEIGHT;
    section.rows.forEach((row, rowIndex) => {
      row.forEach((layout, columnIndex) => {
        const x = PAGE_PADDING + columnIndex * (cardWidth + COLUMN_GAP);
        drawSessionCard(
          context,
          layout,
          labels,
          palette,
          metrics,
          x,
          rowY,
          cardWidth,
          showTrack,
        );
      });
      rowY += section.rowHeights[rowIndex] + CARD_GAP;
    });
    sectionY +=
      section.height + (sectionIndex < sections.length - 1 ? SECTION_GAP : 0);
  });

  context.fillStyle = palette.muted;
  context.font = `600 14px ${FONT_FAMILY}`;
  context.textAlign = "center";
  context.fillText(
    "TECHMUJIN · MY SCHEDULE",
    IMAGE_WIDTH / 2,
    imageHeight - 26,
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
