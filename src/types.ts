import type { TrackId } from "techmujin-api";

export type SessionFormat = "talk" | "networking" | "break";

export type EventSchedule = {
  id: string;
  title: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string | null;
  url: string | null;
};

export type Session = {
  id: string;
  startsAt: string;
  endsAt: string;
  startTime: string;
  endTime: string;
  title: string;
  speaker: string;
  speakerImage: string;
  tags: string[];
  trackId: TrackId;
  format: SessionFormat;
};

export type ScheduleData = {
  eventSchedule: EventSchedule;
  sessions: Session[];
};
