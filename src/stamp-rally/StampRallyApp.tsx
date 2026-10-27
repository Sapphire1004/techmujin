import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "../components/AppHeader";
import { saveLanguage, type SupportedLanguage } from "../i18n";
import {
  getAppHash,
  getAppView,
  type AppView,
  type TimetableView,
} from "../navigation";
import "./stamp-rally.css";

const StampRally = lazy(() =>
  import("./StampRally").then(({ StampRally: Component }) => ({
    default: Component,
  })),
);

export function StampRallyApp({
  renderTimetable,
}: {
  renderTimetable: (view: TimetableView) => ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<AppView>(() =>
    getAppView(window.location.hash),
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

  useEffect(() => {
    const changeRoute = () => {
      setActiveView(getAppView(window.location.hash));
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", changeRoute);
    return () => window.removeEventListener("hashchange", changeRoute);
  }, []);

  const changeView = (view: AppView) => {
    setActiveView(view);
    window.location.hash = getAppHash(view);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const changeLanguage = (language: SupportedLanguage) => {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  };

  return (
    <div className="app-frame">
      <AppHeader
        activeView={activeView}
        currentLanguage={currentLanguage}
        onLanguageChange={changeLanguage}
        onViewChange={changeView}
      />
      {activeView === "stamp-rally" ? (
        <Suspense
          fallback={
            <div className="app-shell app-shell--status" role="status">
              {t("rally.loading")}
            </div>
          }
        >
          <StampRally />
        </Suspense>
      ) : (
        renderTimetable(activeView)
      )}
    </div>
  );
}
