export type SessionFormat = "talk" | "networking" | "break";

export type EventSchedule = {
  dateLabel: string;
  startTime: string;
  endTime: string;
};

export type Session = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  speaker: string;
  speakerImage: string;
  tags: string[];
  format: SessionFormat;
};

export type ScheduleData = {
  eventSchedule: EventSchedule;
  sessions: Session[];
};
