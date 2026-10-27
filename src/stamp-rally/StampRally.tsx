import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "../LanguageSwitch";
import type { SupportedLanguage } from "../i18n";
import { STAMP_SPOTS } from "./rally";
import { useStampCard, type StampStorageWarning } from "./useStampCard";
import "./stamp-rally.css";

const ScannerDialog = lazy(() =>
  import("./ScannerDialog").then(({ ScannerDialog: Component }) => ({
    default: Component,
  })),
);

function formatVisitTime(value: string, language: SupportedLanguage) {
  const locale = language === "ko" ? "ko-KR" : language === "en" ? "en-US" : "ja-JP";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function warningKey(warning: StampStorageWarning) {
  return warning ? `rally.storage.${warning}` : null;
}

export function StampRally() {
  const { t, i18n } = useTranslation();
  const { card, warning, join, scan } = useStampCard();
  const [scannerOpen, setScannerOpen] = useState(false);
  const count = Object.keys(card.visits).length;
  const complete = count === STAMP_SPOTS.length;
  const joined = card.joinedAt !== null;
  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;
  const storageWarningKey = warningKey(warning);

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    document.title = t("rally.metaTitle");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("rally.metaDescription"));
  }, [currentLanguage, t]);

  return (
    <div className="app-shell rally-shell">
      <header className="masthead rally-masthead">
        <div className="masthead__issue">
          <span>TECHMUJIN STAMP RALLY</span>
          <LanguageSwitch />
        </div>
        <Text as="h1" textStyle="screenTitle">
          {t("rally.title")}
        </Text>
        <Text
          as="p"
          className="masthead__note"
          color="fg.neutralMuted"
          textStyle="t4Regular"
        >
          {t("rally.note")}
        </Text>
        <div className="masthead__rule" aria-hidden="true" />
      </header>

      <main className="rally-main">
        <p className="rally-prototype-notice" role="note">
          <strong>{t("navigation.prototype")}</strong>
          {t("navigation.description")}
        </p>
        <section className="rally-steps" aria-label={t("rally.steps.label")}>
          {(["join", "scan", "complete"] as const).map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{t(`rally.steps.${step}.title`)}</strong>
                <p>{t(`rally.steps.${step}.description`)}</p>
              </div>
            </div>
          ))}
        </section>

        {storageWarningKey && (
          <p className="storage-warning" role="alert">
            {t(storageWarningKey)}
          </p>
        )}

        <div className="rally-layout">
          <aside className="rally-passport" aria-label={t("rally.progress.label")}>
            <div className="rally-passport__topline">
              <span>TECHMUJIN / 2026</span>
              <Badge
                size="medium"
                tone={complete ? "brand" : "neutral"}
                variant="weak"
              >
                {t(
                  complete
                    ? "rally.progress.complete"
                    : joined
                      ? "rally.progress.joined"
                      : "rally.progress.ready",
                )}
              </Badge>
            </div>
            <Text as="h2" textStyle="t8Bold">
              {t(
                complete
                  ? "rally.progress.completeTitle"
                  : joined
                    ? "rally.progress.joinedTitle"
                    : "rally.progress.readyTitle",
              )}
            </Text>
            <p>
              {t(
                complete
                  ? "rally.progress.completeDescription"
                  : joined
                    ? "rally.progress.joinedDescription"
                    : "rally.progress.readyDescription",
              )}
            </p>
            <div className="rally-progress__numbers" aria-live="polite">
              <span>{t("rally.progress.title")}</span>
              <strong>
                {count}<span> / {STAMP_SPOTS.length}</span>
              </strong>
            </div>
            <div
              className="rally-progress__bar"
              role="progressbar"
              aria-label={t("rally.progress.label")}
              aria-valuemin={0}
              aria-valuemax={STAMP_SPOTS.length}
              aria-valuenow={count}
            >
              <span style={{ width: `${(count / STAMP_SPOTS.length) * 100}%` }} />
            </div>
            <p className="rally-progress__caption">
              {complete
                ? t("rally.progress.allCollected")
                : t("rally.progress.remaining", {
                    count: STAMP_SPOTS.length - count,
                  })}
            </p>
            <ActionButton
              className="rally-primary-action"
              variant="brandSolid"
              size="large"
              type="button"
              onClick={() => {
                if (joined) setScannerOpen(true);
                else join();
              }}
            >
              {t(joined ? "rally.scan" : "rally.join")}
            </ActionButton>
          </aside>

          <section className="rally-collection" aria-labelledby="stamp-card-title">
            <div className="rally-section-heading">
              <div>
                <span className="rally-eyebrow">MY STAMP CARD</span>
                <Text as="h2" id="stamp-card-title" textStyle="t8Bold">
                  {t("rally.cardTitle")}
                </Text>
              </div>
              <span>{t("rally.cardCaption")}</span>
            </div>
            <div className="rally-stamp-grid">
              {STAMP_SPOTS.map((spot) => {
                const visitedAt = card.visits[spot.id];
                return (
                  <article
                    className="rally-stamp-card"
                    data-collected={Boolean(visitedAt)}
                    key={spot.id}
                    aria-label={t("rally.spotLabel", {
                      spot: spot.title,
                      status: t(
                        visitedAt ? "rally.visited" : "rally.unvisited",
                      ),
                    })}
                  >
                    <div className="rally-stamp-card__top">
                      <span>SPOT {spot.number}</span>
                      <span>{t(visitedAt ? "rally.visited" : "rally.unvisited")}</span>
                    </div>
                    <div className="rally-stamp-card__seal" aria-hidden="true">
                      <span>{visitedAt ? "✓" : spot.number}</span>
                    </div>
                    <Text as="h3" textStyle="t5Bold">
                      {spot.title}
                    </Text>
                    <p>{spot.description}</p>
                    <div className="rally-stamp-card__time">
                      {visitedAt
                        ? formatVisitTime(visitedAt, currentLanguage)
                        : t("rally.waiting")}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {scannerOpen && (
        <Suspense fallback={null}>
          <ScannerDialog onScan={scan} onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}

    </div>
  );
}
