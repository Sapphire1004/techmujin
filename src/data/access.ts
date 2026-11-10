// 公式イベントサイトと山梨大学の交通案内を確認（2026-11-10）。
const walkingRoute = new URL("https://www.google.com/maps/dir/");
walkingRoute.search = new URLSearchParams({
  api: "1",
  origin: "甲府駅 北口",
  destination: "山梨大学 甲府キャンパス",
  travelmode: "walking",
}).toString();

export const accessInfo = {
  walkingMinutes: 15,
  busStand: 2,
  busRoutes: { takeda: "10・11", sekisuiji: "12" },
  walkingRouteUrl: walkingRoute.href,
  busGuideUrl: "https://ykbus.jp/route_bus/kofu_station_north_bus_terminal",
  parking: {
    name: "ザ・パーク 山梨大学南",
    dailyPrice: 500,
    mapUrl: "https://maps.app.goo.gl/kvepifgmrJ1AUFrz7",
  },
  eventSourceUrl: "https://techmujin.jp/2026/#access",
  universitySourceUrl: "https://www.eng.yamanashi.ac.jp/contact/access/",
} as const;
