// 公式イベントサイト・駐車場運営会社・大学の案内を確認（2026-11-10）。
type ParkingLot = {
  id: string;
  name: string;
  address?: string;
  price: number;
  priceType: "daily" | "ticket24h" | "maximum24h";
  capacity?: number;
  payment?: "prepaid" | "cashPostpaid";
  open24Hours?: boolean;
  mapUrl: string;
  sourceUrl: string;
  sourceType: "event" | "operator";
};

function parkingMapUrl(name: string, address: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.search = new URLSearchParams({ api: "1", query: `${name} ${address}` }).toString();
  return url.href;
}

const parkingLots: readonly ParkingLot[] = [
  {
    id: "the-park-yamanashi-university-south",
    name: "ザ・パーク 山梨大学南",
    price: 500,
    priceType: "daily",
    mapUrl: "https://maps.app.goo.gl/kvepifgmrJ1AUFrz7",
    sourceUrl: "https://techmujin.jp/2026/#faq",
    sourceType: "event",
  },
  {
    id: "park-japan-takeda-2",
    name: "パークジャパン 武田第2",
    address: "山梨県甲府市武田3-17",
    price: 500,
    priceType: "ticket24h",
    capacity: 8,
    payment: "prepaid",
    mapUrl: parkingMapUrl("パークジャパン 武田第2", "山梨県甲府市武田3-17"),
    sourceUrl: "https://www.parkjapan.com/search/parkinginfo1_1001537.html",
    sourceType: "operator",
  },
  {
    id: "welcome-park-kofu-takeda",
    name: "ウェルカムパーク甲府武田",
    address: "山梨県甲府市武田2-8",
    price: 400,
    priceType: "maximum24h",
    capacity: 8,
    payment: "cashPostpaid",
    open24Hours: true,
    mapUrl: parkingMapUrl("ウェルカムパーク甲府武田", "山梨県甲府市武田2-8"),
    sourceUrl: "https://cityresearch.co.jp/coinparking/wp-kofu/",
    sourceType: "operator",
  },
];

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
  parkingLots,
  parkingVerifiedAt: "2026-11-10",
  eventSourceUrl: "https://techmujin.jp/2026/#access",
  universitySourceUrl: "https://www.eng.yamanashi.ac.jp/contact/access/",
} as const;
