import { z } from "zod";
import type { SessionType, Timetable } from "techmujin-api";
import type { ScheduleData, SessionFormat } from "../types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const personSchema = z.object({
  name: z.string(),
  iconUrl: z.url().nullable(),
});

const communitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  url: z.url().nullable(),
  iconUrl: z.url().nullable(),
  descriptionMarkdown: z.string().nullable(),
});

const linkSchema = z.object({
  label: z.string(),
  url: z.url(),
});

const apiSessionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["session", "break", "free"]),
  type: z.enum(["opening", "talk", "lt", "sponsor", "closing"]).nullable(),
  group: z.string().nullable(),
  trackId: z.enum(["track-a", "track-b"]).nullable(),
  title: z.string().min(1),
  startsAt: z.string().regex(DATE_TIME_PATTERN),
  endsAt: z.string().regex(DATE_TIME_PATTERN),
  communities: z.array(communitySchema),
  speakers: z.array(personSchema),
  descriptionMarkdown: z.string().nullable(),
  message: z.string().nullable(),
  isCancelled: z.boolean(),
  links: z.array(linkSchema),
});

export const timetableSchema: z.ZodType<Timetable> = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().min(1),
    updatedAt: z.string().regex(DATE_TIME_PATTERN),
    event: z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      date: z.string().regex(DATE_PATTERN),
      timezone: z.string().min(1),
      venue: z.string().nullable(),
      url: z.url().nullable(),
    }),
    sessions: z.array(apiSessionSchema).min(1),
  })
  .superRefine(({ sessions }, context) => {
    const sessionIds = new Set<string>();

    sessions.forEach((session, index) => {
      const startsAt = Date.parse(session.startsAt);
      const endsAt = Date.parse(session.endsAt);

      if (endsAt <= startsAt) {
        context.addIssue({
          code: "custom",
          path: ["sessions", index, "endsAt"],
          message: "endsAt must be later than startsAt",
        });
      }

      if (sessionIds.has(session.id)) {
        context.addIssue({
          code: "custom",
          path: ["sessions", index, "id"],
          message: "session id must be unique",
        });
      }
      sessionIds.add(session.id);

      const previousSession = sessions[index - 1];
      if (
        previousSession &&
        startsAt < Date.parse(previousSession.endsAt)
      ) {
        context.addIssue({
          code: "custom",
          path: ["sessions", index, "startsAt"],
          message: "sessions must be ordered without overlaps in one-track mode",
        });
      }
    });
  });

function readTime(dateTime: string) {
  return dateTime.slice(11, 16);
}

function getFormat(kind: "session" | "break" | "free"): SessionFormat {
  return kind === "session" ? "talk" : "break";
}

const SESSION_TYPE_LABELS: Record<Exclude<SessionType, null>, string> = {
  opening: "オープニングセッション",
  talk: "トークセッション",
  lt: "LTセッション",
  sponsor: "スポンサーセッション",
  closing: "クロージングセッション",
};

function getTags(type: SessionType) {
  return [type === null ? "セッション" : SESSION_TYPE_LABELS[type]];
}

export function parseSchedule(value: unknown): ScheduleData {
  const timetable = timetableSchema.parse(value);
  const firstSession = timetable.sessions[0];
  const lastSession = timetable.sessions.at(-1)!;

  return {
    eventSchedule: {
      dateLabel: timetable.event.date,
      startTime: readTime(firstSession.startsAt),
      endTime: readTime(lastSession.endsAt),
    },
    sessions: timetable.sessions.map((session) => ({
      id: session.id,
      startTime: readTime(session.startsAt),
      endTime: readTime(session.endsAt),
      title: session.title,
      speaker: session.speakers.map(({ name }) => name).join(" / "),
      speakerImage:
        session.speakers.find(({ iconUrl }) => iconUrl !== null)?.iconUrl ?? "",
      tags: getTags(session.type),
      trackId: session.trackId,
      format: getFormat(session.kind),
    })),
  };
}
