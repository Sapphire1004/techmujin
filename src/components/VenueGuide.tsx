import { useMemo, useState, type CSSProperties } from "react";
import { ActionButton, Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import { venueGuideResult, type VenueZone } from "../data/venue";

const ZOOM_LEVELS = [1, 1.25, 1.5] as const;

function zoneStyle(zone: VenueZone) {
  return {
    "--zone-x": `${zone.x}%`,
    "--zone-y": `${zone.y}%`,
    "--zone-width": `${zone.width}%`,
    "--zone-height": `${zone.height}%`,
  } as CSSProperties;
}

export function VenueGuide() {
  const { t } = useTranslation();
  const venueGuide = venueGuideResult.success ? venueGuideResult.data : null;
  const [selectedZoneId, setSelectedZoneId] = useState(
    venueGuide?.zones[0]?.id ?? "",
  );
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const selectedZone = useMemo(
    () =>
      venueGuide?.zones.find(({ id }) => id === selectedZoneId) ??
      venueGuide?.zones[0],
    [selectedZoneId, venueGuide],
  );

  if (!venueGuide) {
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

  return (
    <section className="venue-guide" aria-labelledby="venue-guide-heading">
      <header className="venue-guide__heading">
        <div>
          <Text as="h2" id="venue-guide-heading" textStyle="t8Bold">
            {t("venue.title")}
          </Text>
          <Text
            as="p"
            className="venue-guide__lead"
            color="fg.neutralMuted"
            textStyle="t4Regular"
          >
            {t("venue.description")}
          </Text>
        </div>
        <Badge size="large" tone="neutral" variant="weak">
          {t("venue.zoneOverview")}
        </Badge>
      </header>

      <div className="venue-summary">
        <div className="venue-summary__item">
          <span>{t("venue.venueLabel")}</span>
          <strong>{venueGuide.venue.name}</strong>
          <small>{venueGuide.venue.address}</small>
        </div>
        <div className="venue-summary__item">
          <span>{t("venue.openHoursLabel")}</span>
          <strong>{venueGuide.openHours}</strong>
          <small>{t("venue.openHoursNote")}</small>
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

      <p className="venue-guide__notice" role="note">
        {t("venue.layoutNotice")}
      </p>

      <div className="venue-layout">
        <div className="venue-map-card">
          <div className="venue-map-card__heading">
            <div>
              <Text as="h3" textStyle="t6Bold">
                {t("venue.mapTitle")}
              </Text>
              <Text as="p" color="fg.neutralMuted" textStyle="t3Regular">
                {t("venue.mapHelp")}
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
            role="region"
            aria-label={t("venue.mapRegion")}
            tabIndex={0}
          >
            <div
              className="venue-map"
              style={{
                width: `${zoom * 100}%`,
                minWidth: `${36 * zoom}rem`,
              }}
            >
              <span className="venue-map__front" aria-hidden="true">
                {t("venue.front")}
              </span>
              {venueGuide.zones.map((zone) => (
                <button
                  className="venue-zone"
                  data-active={selectedZoneId === zone.id}
                  data-tone={zone.tone}
                  type="button"
                  key={zone.id}
                  aria-pressed={selectedZoneId === zone.id}
                  style={zoneStyle(zone)}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <strong>{zone.name}</strong>
                  <span>{zone.location}</span>
                </button>
              ))}
              <span className="venue-map__entrance" aria-hidden="true">
                {t("venue.entrance")}
              </span>
            </div>
          </div>
        </div>

        {selectedZone && (
          <aside className="venue-zone-detail" aria-live="polite">
            <span className="venue-zone-detail__label">
              {t("venue.selectedZone")}
            </span>
            <Text as="h3" textStyle="t6Bold">
              {selectedZone.name}
            </Text>
            <p>{selectedZone.description}</p>
            <dl>
              <div>
                <dt>{t("venue.locationLabel")}</dt>
                <dd>{selectedZone.location}</dd>
              </div>
              {selectedZone.id === "booth" && (
                <div>
                  <dt>{t("venue.boothCountLabel")}</dt>
                  <dd>
                    {t("venue.boothCount", { count: venueGuide.booths.length })}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        )}
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
          <Badge size="large" tone="brand" variant="weak">
            {t("venue.boothCount", { count: venueGuide.booths.length })}
          </Badge>
        </div>

        {venueGuide.booths.length > 0 ? (
          <div className="booth-directory__grid">
            {venueGuide.booths.map((booth) => (
              <article className="booth-card" key={booth.id}>
                <span className="booth-card__number">
                  {booth.number ?? t("venue.boothNumberPending")}
                </span>
                <Text as="h4" textStyle="t5Bold">
                  {booth.name}
                </Text>
                <p>{booth.description}</p>
                <a href={booth.url} target="_blank" rel="noreferrer">
                  {t("venue.exhibitorLink")}
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="venue-state venue-state--empty">
            <Text as="h4" textStyle="t5Bold">
              {t("venue.noBoothsTitle")}
            </Text>
            <p>{t("venue.noBoothsBody")}</p>
          </div>
        )}
      </section>

      <p className="venue-guide__source">
        {t("venue.sourcePrefix")}{" "}
        <a href="https://techmujin.jp/2026/" target="_blank" rel="noreferrer">
          {t("venue.sourceLink")}
        </a>
      </p>
    </section>
  );
}
