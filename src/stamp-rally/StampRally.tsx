import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "../i18n";
import { countCollectedStamps, type StampSpot } from "./rally";
import type { useStampCard, StampLinkResult, StampStorageWarning } from "./useStampCard";
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

export function StampRally({ spots, stampCard, linkResult, onRetryStamp }: {
  spots: readonly StampSpot[];
  stampCard: ReturnType<typeof useStampCard>;
  linkResult: StampLinkResult | null;
  onRetryStamp: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { card, warning, join, scan } = stampCard;
  const [scannerOpen, setScannerOpen] = useState(false);
  const [recentSpotId, setRecentSpotId] = useState<string | null>(null);
  const collectionRef = useRef<HTMLElement>(null);
  const returnToCardRef = useRef(false);
  const count = countCollectedStamps(card, spots);
  const complete = spots.length > 0 && count === spots.length;
  const joined = card.joinedAt !== null;
  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;
  const storageWarningKey = warningKey(warning);
  const recentSpot = spots.find((spot) => spot.id === recentSpotId);
  const openScanner = () => {
    setRecentSpotId(null);
    setScannerOpen(true);
  };

  useEffect(() => {
    if (scannerOpen || !returnToCardRef.current) return;
    returnToCardRef.current = false;
    collectionRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    collectionRef.current?.focus({ preventScroll: true });
  }, [scannerOpen]);

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    document.title = t("rally.metaTitle");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("rally.metaDescription"));
  }, [currentLanguage, t]);

  return (
    <div className="app-shell rally-shell" id="stamp-rally-panel">
      <header className="masthead rally-masthead">
        <div className="masthead__issue">
          <span>TECHMUJIN STAMP RALLY</span>
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
          {t("rally.note", { count: spots.length })}
        </Text>
        <div className="masthead__rule" aria-hidden="true" />
      </header>

      <main className="rally-main">
        <p className="rally-prototype-notice" role="note">
          <strong>{t("rally.prototype")}</strong>
          {t("rally.prototypeDescription")}
        </p>
        {storageWarningKey && (
          <p className="storage-warning" role="alert">
            {t(storageWarningKey)}
          </p>
        )}

        {linkResult && (
          <div
            className="rally-feedback rally-link-feedback"
            data-success={linkResult.persisted}
            role={linkResult.persisted ? "status" : "alert"}
          >
            <p>{t(
              linkResult.kind === "invalid"
                ? "rally.link.invalid"
                : !linkResult.persisted
                  ? "rally.link.saveFailed"
                  : linkResult.kind === "duplicate"
                    ? "rally.link.duplicate"
                    : "rally.link.added",
              { spot: linkResult.spot?.title },
            )}</p>
            {linkResult.kind !== "invalid" && !linkResult.persisted && (
              <ActionButton variant="brandSolid" size="medium" type="button" onClick={onRetryStamp}>
                {t("rally.link.retry")}
              </ActionButton>
            )}
          </div>
        )}

        <section className="rally-steps" aria-label={t("rally.steps.label")}>
          {(["join", "scan", "complete"] as const).map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{t(`rally.steps.${step}.title`)}</strong>
                <p>{t(`rally.steps.${step}.description`, { count: spots.length })}</p>
              </div>
            </div>
          ))}
        </section>

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
                { count: spots.length },
              )}
            </p>
            <div className="rally-progress__numbers" aria-live="polite">
              <span>{t("rally.progress.title")}</span>
              <strong>
                {count}<span> / {spots.length}</span>
              </strong>
            </div>
            <div
              className="rally-progress__bar"
              role="progressbar"
              aria-label={t("rally.progress.label")}
              aria-valuemin={0}
              aria-valuemax={spots.length}
              aria-valuenow={count}
            >
              <span style={{ width: `${spots.length ? (count / spots.length) * 100 : 0}%` }} />
            </div>
            <p className="rally-progress__caption">
              {complete
                ? t("rally.progress.allCollected")
                : t("rally.progress.remaining", {
                    count: spots.length - count,
                  })}
            </p>
            {!joined && <ActionButton
              className="rally-primary-action"
              variant="brandSolid"
              size="large"
              type="button"
              onClick={() => {
                join();
                openScanner();
              }}
            >
              {t("rally.join")}
            </ActionButton>}
            <p className="rally-passport__note">{t("rally.openWithCamera")}</p>
            {joined && !complete && (
              <ActionButton
                className="rally-primary-action"
                variant="brandSolid"
                size="large"
                type="button"
                onClick={openScanner}
              >
                {t("rally.scanInBrowser")}
              </ActionButton>
            )}
          </aside>

          <section className="rally-collection" ref={collectionRef} tabIndex={-1} aria-labelledby="stamp-card-title">
            {recentSpot && (
              <p className="rally-feedback rally-card-feedback" data-success="true" role="status">
                {t("rally.scanner.added", { spot: recentSpot.title })}
              </p>
            )}
            <div className="rally-section-heading">
              <div>
                <span className="rally-eyebrow">MY STAMP CARD</span>
                <Text as="h2" id="stamp-card-title" textStyle="t8Bold">
                  {t("rally.cardTitle")}
                </Text>
              </div>
            </div>
            <div className="rally-stamp-grid">
              {spots.map((spot) => {
                const visitedAt = card.visits[spot.id];
                return (
                  <article
                    className="rally-stamp-card"
                    data-collected={Boolean(visitedAt)}
                    data-recent={recentSpotId === spot.id}
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
                      <span>{t(recentSpotId === spot.id ? "rally.scanner.justCollected" : visitedAt ? "rally.visited" : "rally.unvisited")}</span>
                    </div>
                    <div className="rally-stamp-card__seal" aria-hidden="true">
                      <span>{visitedAt ? "✓" : spot.number}</span>
                    </div>
                    <Text as="h3" textStyle="t5Bold">
                      {spot.title}
                    </Text>
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
          <ScannerDialog
            spots={spots}
            onScan={scan}
            onClose={() => setScannerOpen(false)}
            onViewCard={(spotId) => {
              setRecentSpotId(spotId ?? null);
              returnToCardRef.current = true;
              setScannerOpen(false);
            }}
          />
        </Suspense>
      )}

    </div>
  );
}
