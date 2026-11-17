export const APP_VIEWS = ["program", "access", "venue", "stamp-rally"] as const;

export type AppView = (typeof APP_VIEWS)[number];
export type TimetableView = Exclude<AppView, "stamp-rally">;

// 未設定時は表示を維持し、falseを指定したビルドでは会場内マップを非表示にします。
export const isVenueMapEnabled =
  import.meta.env?.VITE_ENABLE_VENUE_MAP?.toLowerCase() !== "false";

const VIEW_HASHES: Record<AppView, string> = {
  program: "#timetable",
  access: "#access",
  venue: "#venue",
  "stamp-rally": "#stamp-rally",
};

export function getAppView(hash: string, search = ""): AppView {
  if (new URLSearchParams(search).has("stamp")) return "stamp-rally";
  const view = APP_VIEWS.find((view) => VIEW_HASHES[view] === hash) ?? "program";
  return view === "venue" && !isVenueMapEnabled ? "program" : view;
}

export function getAppHash(view: AppView): string {
  return VIEW_HASHES[view];
}
