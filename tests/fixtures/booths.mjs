const names = ["SORACOM UG 山梨", "スクラッチディ in 山梨", "kintone Café 山梨", "甲斐国もくもく会"];

export function makeBoothList(numbers = ["1", "2", "3", "4"]) {
  return {
    schemaVersion: 1,
    version: "booths-test-v1",
    updatedAt: "2026-11-08T23:22:30+09:00",
    event: {
      id: "techmujin-2026",
      title: "テック無尽 2026",
      date: "2026-11-22",
      timezone: "Asia/Tokyo",
      venue: "山梨大学 甲府キャンパス 共創環境棟 治ホール",
      url: null,
    },
    booths: numbers.map((number, index) => ({
      number,
      title: null,
      communities: [{
        id: `community-${index + 1}`,
        name: names[index] ?? `コミュニティ ${number}`,
        url: `https://example.com/communities/${index + 1}`,
        iconUrl: null,
        descriptionMarkdown: `ブース ${number} の紹介です。`,
      }],
      descriptionMarkdown: null,
    })),
  };
}
