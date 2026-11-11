import { useMemo, useState, type CSSProperties } from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import type { Booth } from "techmujin-api";
import { getBoothTitle } from "../data/booths";
import { venueGuideResult, type VenueFeature } from "../data/venue";
import type { BoothsState } from "../hooks/useBooths";
import { BoothsStatus } from "./BoothsStatus";
import { AccessDirections } from "./AccessDirections";

const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;

type VenueGuideProps = {
  view: "access" | "interior";
  booths: BoothsState;
};

function BoothDetails({ booth }: { booth: Booth }) {
  const { t } = useTranslation();
  return (
    <>
      {booth.descriptionMarkdown && <p className="booth-card__description">{booth.descriptionMarkdown}</p>}
      {booth.communities.map((community) => (
        <div className="booth-card__community" key={community.id}>
          {community.iconUrl && <img src={community.iconUrl} alt="" width={40} height={40} loading="lazy" />}
          {(booth.title || booth.communities.length > 1) && <strong>{community.name}</strong>}
          {community.descriptionMarkdown && <p className="booth-card__description">{community.descriptionMarkdown}</p>}
          {community.url && (
            <a href={community.url} target="_blank" rel="noreferrer">
              {t("venue.exhibitorLink")} · {community.name}
            </a>
          )}
        </div>
      ))}
    </>
  );
}

function rectangleStyle(
  rectangle: Pick<VenueFeature, "x" | "y" | "width" | "height">,
) {
  return {
    "--map-x": `${rectangle.x}%`,
    "--map-y": `${rectangle.y}%`,
    "--map-width": `${rectangle.width}%`,
    "--map-height": `${rectangle.height}%`,
  } as CSSProperties;
}

export function VenueGuide({ view, booths }: VenueGuideProps) {
  const { t } = useTranslation();
  const venueGuide = venueGuideResult.success ? venueGuideResult.data : null;
  const [activePlanId, setActivePlanId] = useState(
    venueGuide?.plans[0]?.id ?? "",
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const activePlan = useMemo(
    () =>
      venueGuide?.plans.find(({ id }) => id === activePlanId) ??
      venueGuide?.plans[0],
    [activePlanId, venueGuide],
  );

  const selectedFeature = useMemo(
    () =>
      activePlan?.features.find(({ id }) => id === selectedFeatureId) ?? null,
    [activePlan, selectedFeatureId],
  );

  const selectedBooth = useMemo(
    () =>
      selectedFeature?.boothNumber
        ? booths.data?.booths.find(({ number }) => number === selectedFeature.boothNumber)
        : null,
    [selectedFeature?.boothNumber, booths.data],
  );

  if (!venueGuide || !activePlan) {
    return (
      <section className="venue-state" role="alert">
        <Text as="h2" textStyle="t7Bold">
          {t("venue.dataErrorTitle")}
        </Text>
        <p>{t("venue.dataErrorBody")}</p>
        <ActionButton
          variant="brandSolid"
          size="small"
          type="button"
          onClick={() => window.location.reload()}
        >
          {t("venue.reload")}
        </ActionButton>
      </section>
    );
  }

  const landmarks = activePlan.features.filter(({ kind }) => kind !== "booth");
  const boothSlots = activePlan.features.filter(({ kind }) => kind === "booth");

  const selectPlan = (planId: string) => {
    setActivePlanId(planId);
    setSelectedFeatureId(null);
    setZoomIndex(0);
  };

  return (
    <section
      className="venue-guide"
      aria-label={t(view === "access" ? "venue.accessTab" : "venue.interiorTab")}
    >
      <div
        id="venue-access-panel"
        className="venue-guide__panel"
        hidden={view !== "access"}
      >
        <div className="venue-summary venue-summary--access">
          <div className="venue-summary__item">
            <span>{t("venue.venueLabel")}</span>
            <strong>{venueGuide.venue.name}</strong>
            <small>{venueGuide.venue.address}</small>
          </div>
          <a
            className="venue-summary__map-link"
            href={venueGuide.venue.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("venue.openGoogleMaps")}
          </a>
        </div>
        <div className="venue-access-map">
          <iframe
            src={venueGuide.venue.mapEmbedUrl}
            title={t("venue.mapEmbedTitle")}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        {view === "access" && <AccessDirections />}
      </div>

      <div
        id="venue-interior-panel"
        className="venue-guide__panel"
        hidden={view !== "interior"}
      >
      <div className="venue-summary venue-summary--interior">
        <div className="venue-summary__item">
          <span>{t("venue.openHoursLabel")}</span>
          <strong>{venueGuide.openHours}</strong>
          <small>{t("venue.openHoursNote")}</small>
        </div>
      </div>

      <p className="venue-guide__notice" role="note">
        {t("venue.layoutNotice")}
      </p>

      <div className="venue-plan-switcher">
        <span>{t("venue.planSelector")}</span>
        <div className="venue-plan-switch" role="group" aria-label={t("venue.planSelector")}>
          {venueGuide.plans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              aria-pressed={activePlan.id === plan.id}
              data-active={activePlan.id === plan.id}
              onClick={() => selectPlan(plan.id)}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>

      <div className="venue-layout">
        <div className="venue-map-card">
          <div className="venue-map-card__heading">
            <div>
              <Text as="h3" textStyle="t6Bold">
                {t("venue.mapTitle", { name: activePlan.name })}
              </Text>
              <Text as="p" color="fg.neutralMuted" textStyle="t3Regular">
                {boothSlots.length > 0
                  ? t("venue.mapHelp")
                  : activePlan.summary}
              </Text>
            </div>
            <div
              className="venue-map-controls"
              role="group"
              aria-label={t("venue.zoomControls")}
            >
              <button
                type="button"
                aria-label={t("venue.zoomOut")}
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
              >
                −
              </button>
              <button
                className="venue-map-controls__level"
                type="button"
                aria-label={t("venue.resetZoom")}
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex(0)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                aria-label={t("venue.zoomIn")}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                onClick={() =>
                  setZoomIndex((current) =>
                    Math.min(ZOOM_LEVELS.length - 1, current + 1),
                  )
                }
              >
                ＋
              </button>
            </div>
          </div>

          <div
            className="venue-map-scroll"
            data-zoomed={zoom > 1}
            role="region"
            aria-label={t("venue.mapRegion", { name: activePlan.name })}
            tabIndex={0}
          >
            <div
              className="venue-map"
              data-plan={activePlan.id}
              data-drawing={activePlan.drawing.code}
              style={{
                width: `${zoom * 100}%`,
                aspectRatio: activePlan.drawing.width / activePlan.drawing.height,
              }}
            >
              <img
                className="venue-map__image"
                src={activePlan.drawing.src}
                alt={t("venue.mapTitle", { name: activePlan.name })}
                width={activePlan.drawing.width}
                height={activePlan.drawing.height}
                decoding="async"
                draggable={false}
              />

              {boothSlots.map((feature) => (
                <button
                  className="venue-feature venue-feature--booth"
                  type="button"
                  key={feature.id}
                  data-feature={feature.id}
                  data-active={selectedFeatureId === feature.id}
                  data-tone={feature.tone}
                  aria-label={t("venue.boothSlotLabel", {
                    number: feature.boothNumber,
                  })}
                  aria-pressed={selectedFeatureId === feature.id}
                  style={rectangleStyle(feature)}
                  onClick={() => setSelectedFeatureId(feature.id)}
                >
                  {feature.boothNumber}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="venue-plan-detail" aria-live="polite">
          <span className="venue-plan-detail__label">
            {selectedFeature ? t("venue.selectedBooth") : t("venue.currentPlan")}
          </span>
          <Text as="h3" textStyle="t6Bold">
            {selectedFeature?.name ?? activePlan.name}
          </Text>
          <p>{selectedFeature?.description ?? activePlan.summary}</p>

          {selectedFeature?.boothNumber && (
            <dl>
              <div>
                <dt>{t("venue.assignmentLabel")}</dt>
                <dd>
                  {selectedBooth ? (
                    <><strong>{getBoothTitle(selectedBooth)}</strong><BoothDetails booth={selectedBooth} /></>
                  ) : (
                    t("venue.assignmentPending")
                  )}
                </dd>
              </div>
            </dl>
          )}

          {boothSlots.length > 0 && !selectedFeature && (
            <p className="venue-plan-detail__count">
              {t("venue.boothSlotCount", { count: boothSlots.length })}
            </p>
          )}

          <div className="venue-facilities">
            <Text as="h4" textStyle="t4Bold">
              {t("venue.facilitiesTitle")}
            </Text>
            <ul>
              {landmarks.map((feature) => (
                <li key={feature.id}>
                  <strong>{feature.name}</strong>
                  <span>{feature.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <section className="booth-directory" aria-labelledby="booth-directory-heading">
        <div className="booth-directory__heading">
          <div>
            <Text as="h3" id="booth-directory-heading" textStyle="t7Bold">
              {t("venue.boothsTitle")}
            </Text>
            <Text as="p" color="fg.neutralMuted" textStyle="t3Regular">
              {t("venue.boothsDescription")}
            </Text>
          </div>
          {booths.status === "success" && <Badge size="large" tone="brand" variant="weak">
            {t("venue.boothCount", { count: booths.data.booths.length })}
          </Badge>}
        </div>

        {booths.status === "success" && booths.data.booths.length > 0 ? (
          <div className="booth-directory__grid">
            {booths.data.booths.map((booth) => (
              <article className="booth-card" key={booth.number}>
                <span className="booth-card__number">
                  {t("venue.boothNumber", { number: booth.number })}
                </span>
                <Text as="h4" textStyle="t5Bold">
                  {getBoothTitle(booth)}
                </Text>
                <BoothDetails booth={booth} />
              </article>
            ))}
          </div>
        ) : (
          <BoothsStatus state={booths} />
        )}
      </section>

      <p className="venue-guide__source">
        {t("venue.layoutSource")} · {t("venue.sourcePrefix")} {" "}
        <a href="https://techmujin.jp/2026/" target="_blank" rel="noreferrer">
          {t("venue.sourceLink")}
        </a>
      </p>
      </div>
    </section>
  );
}
