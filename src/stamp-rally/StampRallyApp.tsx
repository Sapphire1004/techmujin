import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./stamp-rally.css";

const StampRally = lazy(() =>
  import("./StampRally").then(({ StampRally: Component }) => ({
    default: Component,
  })),
);

function isRallyRoute() {
  return window.location.hash === "#stamp-rally";
}

export function StampRallyApp({ timetable }: { timetable: ReactNode }) {
  const { t } = useTranslation();
  const [showRally, setShowRally] = useState(isRallyRoute);

  useEffect(() => {
    document.title = t(showRally ? "rally.metaTitle" : "meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t(showRally ? "rally.metaDescription" : "meta.description"),
      );
  }, [showRally, t]);

  useEffect(() => {
    const changeRoute = () => {
      setShowRally(isRallyRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", changeRoute);
    return () => window.removeEventListener("hashchange", changeRoute);
  }, []);

  return (
    <>
      <nav className="rally-app-nav" aria-label={t("navigation.label")}>
        <a
          href="#timetable"
          aria-current={!showRally ? "page" : undefined}
        >
          {t("navigation.timetable")}
        </a>
        <a
          href="#stamp-rally"
          aria-current={showRally ? "page" : undefined}
        >
          {t("navigation.stampRally")}
        </a>
      </nav>
      {showRally ? (
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
        timetable
      )}
    </>
  );
}
