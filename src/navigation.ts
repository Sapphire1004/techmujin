export const APP_VIEWS = ["program", "access", "venue", "stamp-rally"] as const;

export type AppView = (typeof APP_VIEWS)[number];
export type TimetableView = Exclude<AppView, "stamp-rally">;

const VIEW_HASHES: Record<AppView, string> = {
  program: "#timetable",
  access: "#access",
  venue: "#venue",
  "stamp-rally": "#stamp-rally",
};

export function getAppView(hash: string): AppView {
  return APP_VIEWS.find((view) => VIEW_HASHES[view] === hash) ?? "program";
}

export function getAppHash(view: AppView): string {
  return VIEW_HASHES[view];
}
