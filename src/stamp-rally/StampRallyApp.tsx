import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../components/AppHeader";
import { BoothsStatus } from "../components/BoothsStatus";
import { createStampSpots } from "../data/booths";
import { useBooths, type BoothsState } from "../hooks/useBooths";
import { saveLanguage, type SupportedLanguage } from "../i18n";
import {
  getAppHash,
  getAppView,
  type AppView,
  type TimetableView,
} from "../navigation";
import { STAMP_LINK_PARAMETER } from "./rally";
import { useStampCard, type StampLinkResult } from "./useStampCard";
import "./stamp-rally.css";

const StampRally = lazy(() =>
  import("./StampRally").then(({ StampRally: Component }) => ({
    default: Component,
  })),
);

export function StampRallyApp({
  renderTimetable,
}: {
  renderTimetable: (view: TimetableView, booths: BoothsState) => ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const booths = useBooths();
  const spots = useMemo(() => createStampSpots(booths.data?.booths ?? []), [booths.data]);
  const stampCard = useStampCard(spots);
  const { visitLink } = stampCard;
  const [linkResult, setLinkResult] = useState<StampLinkResult | null>(null);
  const [activeView, setActiveView] = useState<AppView>(() =>
    getAppView(window.location.hash, window.location.search),
  );
  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;

  useEffect(() => {
    const keys = {
      program: ["meta.title", "meta.description"],
      access: ["access.metaTitle", "access.metaDescription"],
      venue: ["venue.metaTitle", "venue.metaDescription"],
      "stamp-rally": ["rally.metaTitle", "rally.metaDescription"],
    } as const;
    document.documentElement.lang = currentLanguage;
    document.title = t(keys[activeView][0]);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(keys[activeView][1]),
      );
  }, [activeView, currentLanguage, t]);

  const changeRoute = useCallback(() => {
    const url = new URL(window.location.href);
    const view = getAppView(url.hash, url.search);
    setActiveView(view);
    // 取得中・通信失敗時にはQRのURLも記録も変更せず、取得成功後に処理します。
    const result = booths.status === "success" ? visitLink(url) : null;
    if (result) setLinkResult(result);
    else if (view !== "stamp-rally") setLinkResult(null);
    if (result && (result.kind === "invalid" || result.persisted)) {
      // 保存に成功してからURLを整え、再読み込みでの再取得を防ぎます。
      url.searchParams.delete(STAMP_LINK_PARAMETER);
      url.hash = getAppHash("stamp-rally");
      window.history.replaceState(window.history.state, "", url);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector('.app-frame[data-active-view="program"] > .app-shell')?.scrollTo({ top: 0, behavior: "instant" });
  }, [visitLink, booths.status]);

  useEffect(() => {
    changeRoute();
    window.addEventListener("hashchange", changeRoute);
    window.addEventListener("popstate", changeRoute);
    return () => {
      window.removeEventListener("hashchange", changeRoute);
      window.removeEventListener("popstate", changeRoute);
    };
  }, [changeRoute]);

  const changeView = (view: AppView) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(STAMP_LINK_PARAMETER);
    url.hash = getAppHash(view);
    if (url.href !== window.location.href) {
      window.history.pushState(window.history.state, "", url);
    }
    setLinkResult(null);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector('.app-frame[data-active-view="program"] > .app-shell')?.scrollTo({ top: 0, behavior: "instant" });
  };

  const changeLanguage = (language: SupportedLanguage) => {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  };

  return (
    <div className="app-frame" data-active-view={activeView}>
      <AppHeader
        activeView={activeView}
        currentLanguage={currentLanguage}
        onLanguageChange={changeLanguage}
        onViewChange={changeView}
      />
      {activeView === "stamp-rally" && (booths.status !== "success" || spots.length === 0) ? (
        <main className="app-shell app-shell--status"><BoothsStatus state={booths} /></main>
      ) : activeView === "stamp-rally" ? (
        <Suspense
          fallback={
            <div className="app-shell app-shell--status" role="status">
              {t("rally.loading")}
            </div>
          }
        >
          <StampRally
            spots={spots}
            stampCard={stampCard}
            linkResult={linkResult}
            onRetryStamp={changeRoute}
          />
        </Suspense>
      ) : (
        renderTimetable(activeView, booths)
      )}
    </div>
  );
}
