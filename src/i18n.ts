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
