import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export type SupportedLanguage = "ja" | "en" | "ko";

export const LANGUAGE_STORAGE_KEY = "techmujin-language";
export const isI18nEnabled =
  import.meta.env.VITE_ENABLE_I18N?.toLowerCase() === "true";
export const languageOptions: ReadonlyArray<{
  code: SupportedLanguage;
  label: string;
}> = isI18nEnabled
  ? [
      { code: "ja", label: "JP" },
      { code: "en", label: "EN" },
      { code: "ko", label: "KR" },
    ]
  : [{ code: "ja", label: "JP" }];

const resources = {
  ja: {
    translation: {
      meta: {
        title: "テックムジン タイムテーブル",
        description:
          "テックムジンのセッションを確認し、自分の予定をブラウザに保存できるタイムテーブルです。",
      },
      language: { selector: "言語を選択" },
      navigation: {
        label: "コンテンツ",
        program: "プログラム",
        venue: "会場マップ",
      },
      hero: {
        title: "テックムジン タイムテーブル",
        note: "セッションを選んで予定を作りましょう。",
        oneDay: "1 DAY",
      },
      filters: {
        label: "タイムテーブルの絞り込み",
        tracks: "トラックの絞り込み",
        allTracks: "すべてのトラック",
        mySchedule: "マイスケジュール {{count}}",
      },
      storage: {
        unavailable:
          "このブラウザではストレージを利用できません。選択内容は現在の画面でのみ保持されます。",
      },
      api: {
        loading: "タイムテーブルを読み込んでいます。",
        error: "タイムテーブルを読み込めませんでした。",
        retry: "もう一度試す",
      },
      schedule: {
        title: "イベントタイムテーブル",
        program: "プログラム",
        stats: "{{visible}}セッション · 保存済み {{saved}}",
        regionLabel: "トラック別イベントタイムテーブル",
        mySchedule: "マイスケジュール",
        selectedCount: "{{count}}件選択",
        time: "時間",
      },
      session: {
        remove: "マイスケジュールから削除",
        add: "マイスケジュールに追加",
        conflictSuffix: "、選択した別のセッションと時間が重複",
        cardLabel: "{{start}}から{{end}}、{{title}}、{{action}}{{conflict}}",
        breakLabel: "{{start}}から{{end}}、{{title}}",
        conflict: "時間重複",
        selected: "参加予定",
      },
      empty: {
        title: "表示するセッションがありません。",
        body: "絞り込みを変更するか、全スケジュールを確認してください。",
        reset: "全スケジュールを見る",
      },
      calendar: {
        download: "ICSをダウンロード",
        openApple: "Appleカレンダーに追加",
        share: "ICSを共有",
        sharing: "共有画面を開いています…",
        shareFallback:
          "共有できなかったため、ICSファイルをダウンロードしました。",
        noSessions: "セッションを選択すると利用できます。",
        imageDownload: "画像をダウンロード",
        imageCreating: "画像を作成中…",
        imageError: "画像を作成できませんでした。もう一度お試しください。",
        imageSessionCount: "{{count}}件のセッション",
        imageSpeaker: "登壇者",
        trackA: "トラック A",
        trackB: "トラック B",
        allTracks: "全トラック",
        morning: "午前",
        afternoon: "午後",
      },
      venue: {
        metaTitle: "テックムジン 会場マップ",
        metaDescription:
          "テックムジン2026の会場案内図と出展予定ブースを確認できます。",
        heroTitle: "テックムジン 会場マップ",
        heroNote: "会場案内図と出展予定ブースを確認できます。",
        title: "会場案内",
        description: "治ホールと交流スペースの位置をご案内します。",
        layoutReady: "会場案内図",
        venueLabel: "会場",
        openHoursLabel: "ブース開設",
        openHoursNote: "ステージ進行中も自由に出入りできます",
        openGoogleMaps: "Google マップで見る",
        layoutNotice:
          "会場案内図をもとに再構成しています。出展者のブース番号は確定後に更新します。",
        planSelector: "表示するエリア",
        mapTitle: "{{name}}の案内図",
        mapHelp: "ブースA〜Gを選ぶと配置を確認できます。",
        zoomControls: "マップの拡大率",
        zoomOut: "マップを縮小",
        zoomIn: "マップを拡大",
        resetZoom: "マップを等倍に戻す",
        mapRegion: "スクロールできる{{name}}の案内図",
        currentPlan: "表示中のエリア",
        selectedBooth: "選択中のブース",
        boothSlotLabel: "ブース{{number}}を選択",
        assignmentLabel: "出展者",
        assignmentPending: "配置は未定です",
        facilitiesTitle: "設備・目印",
        boothSlotCount: "{{count}}区画",
        boothCount: "{{count}}ブース",
        boothNumber: "ブース {{number}}",
        boothsTitle: "出展予定ブース",
        boothsDescription:
          "公式サイトでブース出展が案内されているコミュニティです。",
        boothNumberPending: "番号未定",
        exhibitorLink: "公式ページ",
        noBoothsTitle: "出展情報を準備しています。",
        noBoothsBody: "出展者が確定次第、この一覧を更新します。",
        dataErrorTitle: "会場マップを表示できませんでした。",
        dataErrorBody: "会場データを確認して、もう一度読み込んでください。",
        reload: "再読み込み",
        layoutSource: "提供された会場案内図をもとに再構成",
        sourcePrefix: "会場・出展情報の出典:",
        sourceLink: "テックムジン2026 公式サイト",
      },
    },
  },
  en: {
    translation: {
      meta: {
        title: "TechMujin Timetable",
        description:
          "Browse TechMujin sessions and save your personal schedule in this browser.",
      },
      language: { selector: "Select language" },
      navigation: {
        label: "Contents",
        program: "Program",
        venue: "Venue map",
      },
      hero: {
        title: "TechMujin Timetable",
        note: "Select sessions to build your schedule.",
        oneDay: "ONE DAY",
      },
      filters: {
        label: "Timetable filters",
        tracks: "Track filters",
        allTracks: "All tracks",
        mySchedule: "My schedule {{count}}",
      },
      storage: {
        unavailable:
          "Storage is unavailable in this browser. Your selection will only remain on the current screen.",
      },
      api: {
        loading: "Loading the timetable.",
        error: "The timetable could not be loaded.",
        retry: "Try again",
      },
      schedule: {
        title: "Event timetable",
        program: "Program",
        stats: "{{visible}} sessions · {{saved}} saved",
        regionLabel: "Event timetable by track",
        mySchedule: "My schedule",
        selectedCount: "{{count}} selected",
        time: "TIME",
      },
      session: {
        remove: "Remove from My schedule",
        add: "Add to My schedule",
        conflictSuffix: ", overlaps another selected session",
        cardLabel: "{{start}} to {{end}}, {{title}}, {{action}}{{conflict}}",
        breakLabel: "{{start}} to {{end}}, {{title}}",
        conflict: "Time conflict",
        selected: "Attending",
      },
      empty: {
        title: "No sessions to display.",
        body: "Change the filter or return to the full schedule.",
        reset: "View full schedule",
      },
      calendar: {
        download: "Download ICS",
        openApple: "Add to Apple Calendar",
        share: "Share ICS",
        sharing: "Opening share menu…",
        shareFallback: "Sharing failed, so the ICS file was downloaded.",
        noSessions: "Select a session to use this feature.",
        imageDownload: "Download image",
        imageCreating: "Creating image…",
        imageError: "The image could not be created. Please try again.",
        imageSessionCount: "{{count}} sessions",
        imageSpeaker: "Speaker",
        trackA: "Track A",
        trackB: "Track B",
        allTracks: "All tracks",
        morning: "Morning",
        afternoon: "Afternoon",
      },
      venue: {
        metaTitle: "TechMujin Venue Map",
        metaDescription:
          "View the TechMujin 2026 venue plans and planned exhibitor booths.",
        heroTitle: "TechMujin Venue Map",
        heroNote: "Check the venue plans and planned exhibitor booths.",
        title: "Venue guide",
        description: "Find your way around Ji Hall and the communication space.",
        layoutReady: "Venue plan",
        venueLabel: "Venue",
        openHoursLabel: "Booths open",
        openHoursNote: "You may enter and leave during stage sessions",
        openGoogleMaps: "Open in Google Maps",
        layoutNotice:
          "This view is reconstructed from the venue plans. Exhibitor booth numbers will be added after they are finalized.",
        planSelector: "Area to display",
        mapTitle: "{{name}} map",
        mapHelp: "Select booth A–G to check its position.",
        zoomControls: "Map zoom",
        zoomOut: "Zoom out",
        zoomIn: "Zoom in",
        resetZoom: "Reset map zoom",
        mapRegion: "Scrollable map of {{name}}",
        currentPlan: "Current area",
        selectedBooth: "Selected booth",
        boothSlotLabel: "Select booth {{number}}",
        assignmentLabel: "Exhibitor",
        assignmentPending: "Assignment pending",
        facilitiesTitle: "Facilities and landmarks",
        boothSlotCount: "{{count}} spaces",
        boothCount: "{{count}} booths",
        boothNumber: "Booth {{number}}",
        boothsTitle: "Planned exhibitor booths",
        boothsDescription:
          "Communities listed as booth exhibitors on the official website.",
        boothNumberPending: "Number pending",
        exhibitorLink: "Official page",
        noBoothsTitle: "Exhibitor details are being prepared.",
        noBoothsBody: "This list will be updated after exhibitors are confirmed.",
        dataErrorTitle: "The venue map could not be displayed.",
        dataErrorBody: "Check the venue data and reload the page.",
        reload: "Reload",
        layoutSource: "Reconstructed from the supplied venue plans",
        sourcePrefix: "Venue and exhibitor source:",
        sourceLink: "TechMujin 2026 official website",
      },
    },
  },
  ko: {
    translation: {
      meta: {
        title: "테크무진 타임테이블",
        description:
          "테크무진 행사 세션을 확인하고 브라우저에 내 일정을 저장하는 타임테이블입니다.",
      },
      language: { selector: "언어 선택" },
      navigation: {
        label: "콘텐츠",
        program: "프로그램",
        venue: "행사장 지도",
      },
      hero: {
        title: "테크무진 타임테이블",
        note: "세션을 눌러 일정을 구성해 보세요.",
        oneDay: "하루 행사",
      },
      filters: {
        label: "타임테이블 필터",
        tracks: "트랙 필터",
        allTracks: "전체 트랙",
        mySchedule: "내 일정 {{count}}",
      },
      storage: {
        unavailable:
          "이 브라우저에서는 저장소를 사용할 수 없습니다. 선택은 현재 화면에서만 유지됩니다.",
      },
      api: {
        loading: "타임테이블을 불러오는 중입니다.",
        error: "타임테이블을 불러오지 못했습니다.",
        retry: "다시 시도",
      },
      schedule: {
        title: "행사 타임테이블",
        program: "프로그램",
        stats: "{{visible}}개 세션 · 저장 {{saved}}개",
        regionLabel: "트랙별 행사 타임테이블",
        mySchedule: "내 일정",
        selectedCount: "{{count}}개 선택",
        time: "시간",
      },
      session: {
        remove: "내 일정에서 빼기",
        add: "내 일정에 추가",
        conflictSuffix: ", 선택한 다른 세션과 시간 겹침",
        cardLabel: "{{start}}부터 {{end}}, {{title}}, {{action}}{{conflict}}",
        breakLabel: "{{start}}부터 {{end}}, {{title}}",
        conflict: "시간 겹침",
        selected: "참석 예정",
      },
      empty: {
        title: "표시할 세션이 없습니다.",
        body: "필터를 바꾸거나 전체 일정을 다시 확인해 주세요.",
        reset: "전체 일정 보기",
      },
      calendar: {
        download: "ICS 다운로드",
        openApple: "Apple 캘린더에 추가",
        share: "ICS 공유",
        sharing: "공유 메뉴 여는 중…",
        shareFallback: "공유하지 못해 ICS 파일을 다운로드했습니다.",
        noSessions: "세션을 선택하면 사용할 수 있습니다.",
        imageDownload: "이미지 다운로드",
        imageCreating: "이미지 만드는 중…",
        imageError: "이미지를 만들지 못했습니다. 다시 시도해 주세요.",
        imageSessionCount: "세션 {{count}}개",
        imageSpeaker: "발표자",
        trackA: "트랙 A",
        trackB: "트랙 B",
        allTracks: "전체 트랙",
        morning: "오전",
        afternoon: "오후",
      },
      venue: {
        metaTitle: "TechMujin 행사장 지도",
        metaDescription:
          "TechMujin 2026 행사장 안내도와 참가 예정 부스를 확인할 수 있습니다.",
        heroTitle: "TechMujin 행사장 지도",
        heroNote: "행사장 안내도와 참가 예정 부스를 확인할 수 있습니다.",
        title: "행사장 안내",
        description: "治 홀과 교류 공간의 위치를 안내합니다.",
        layoutReady: "행사장 안내도",
        venueLabel: "행사장",
        openHoursLabel: "부스 운영",
        openHoursNote: "무대 진행 중에도 자유롭게 출입할 수 있습니다",
        openGoogleMaps: "Google 지도에서 보기",
        layoutNotice:
          "제공된 행사장 안내도를 바탕으로 재구성했습니다. 참가자의 부스 번호는 확정 후 업데이트합니다.",
        planSelector: "표시할 공간",
        mapTitle: "{{name}} 안내도",
        mapHelp: "A–G 부스를 선택하면 위치를 확인할 수 있습니다.",
        zoomControls: "지도 확대 비율",
        zoomOut: "지도 축소",
        zoomIn: "지도 확대",
        resetZoom: "지도 배율 초기화",
        mapRegion: "스크롤 가능한 {{name}} 안내도",
        currentPlan: "현재 공간",
        selectedBooth: "선택한 부스",
        boothSlotLabel: "{{number}} 부스 선택",
        assignmentLabel: "참가자",
        assignmentPending: "배정 전입니다",
        facilitiesTitle: "시설·기준점",
        boothSlotCount: "{{count}}개 구역",
        boothCount: "부스 {{count}}개",
        boothNumber: "부스 {{number}}",
        boothsTitle: "참가 예정 부스",
        boothsDescription: "공식 사이트에 부스 참가로 안내된 커뮤니티입니다.",
        boothNumberPending: "번호 미정",
        exhibitorLink: "공식 페이지",
        noBoothsTitle: "참가 정보를 준비하고 있습니다.",
        noBoothsBody: "참가자가 확정되면 이 목록을 업데이트합니다.",
        dataErrorTitle: "행사장 지도를 표시할 수 없습니다.",
        dataErrorBody: "행사장 데이터를 확인한 뒤 다시 불러와 주세요.",
        reload: "다시 불러오기",
        layoutSource: "제공된 행사장 안내도를 바탕으로 재구성",
        sourcePrefix: "행사장·부스 정보 출처:",
        sourceLink: "TechMujin 2026 공식 사이트",
      },
    },
  },
};

function getInitialLanguage(): SupportedLanguage {
  if (!isI18nEnabled) return "ja";

  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "ja" || savedLanguage === "en" || savedLanguage === "ko") {
      return savedLanguage;
    }
  } catch {
    // localStorage를 사용할 수 없는 환경에서는 기본 언어를 사용합니다.
  }

  return "ja";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "ja",
  supportedLngs: languageOptions.map(({ code }) => code),
  interpolation: { escapeValue: false },
});

export function saveLanguage(language: SupportedLanguage) {
  if (!isI18nEnabled) return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 언어 전환은 유지하고, 저장만 생략합니다.
  }
}

export default i18n;
