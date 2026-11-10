import type { ReactNode } from "react";
import { Badge, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import { accessInfo } from "../data/access";

function DirectionCard({ label, title, children }: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="access-direction">
      <Badge size="medium" tone="brand" variant="weak">{label}</Badge>
      <Text as="h3" textStyle="t5Bold">{title}</Text>
      {children}
    </article>
  );
}

export function AccessDirections() {
  const { t } = useTranslation();
  return (
    <div className="access-directions">
      <section className="access-directions__section" aria-labelledby="access-parking-heading">
        <Text as="h2" id="access-parking-heading" textStyle="t7Bold">
          {t("access.transport.parkingTitle")}
        </Text>
        <div className="access-parking-list">
          {accessInfo.parkingLots.map((parking) => (
            <DirectionCard
              key={parking.id}
              label={t(parking.sourceType === "event" ? "access.transport.car.eventListed" : "access.transport.car.nearby")}
              title={parking.name}
            >
              <strong className="access-direction__price">
                {t(`access.transport.car.prices.${parking.priceType}`, { price: parking.price })}
              </strong>
              {parking.sourceType === "event" && <p>{t("access.transport.car.eventDescription")}</p>}
              {parking.address && <p>{parking.address}</p>}
              {(parking.capacity !== undefined || parking.payment || parking.open24Hours) && (
                <dl className="access-parking__facts">
                  {parking.capacity !== undefined && (
                    <div><dt>{t("access.transport.car.capacity")}</dt><dd>{t("access.transport.car.spaces", { count: parking.capacity })}</dd></div>
                  )}
                  {parking.payment && (
                    <div><dt>{t("access.transport.car.payment")}</dt><dd>{t(`access.transport.car.payments.${parking.payment}`)}</dd></div>
                  )}
                  {parking.open24Hours && (
                    <div><dt>{t("access.transport.car.hours")}</dt><dd>{t("access.transport.car.open24Hours")}</dd></div>
                  )}
                </dl>
              )}
              <div className="access-parking__links">
                <a
                  className="access-direction__link"
                  href={parking.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("access.transport.car.mapLabel", { name: parking.name })}
                >
                  {t("access.transport.car.link")}
                </a>
                <a
                  className="access-direction__link"
                  href={parking.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("access.transport.car.detailsLabel", { name: parking.name })}
                >
                  {t(parking.sourceType === "event" ? "access.transport.car.eventDetails" : "access.transport.car.operatorDetails")}
                </a>
              </div>
            </DirectionCard>
          ))}
        </div>
        <p className="access-parking__note">
          {t("access.transport.car.verified", { date: accessInfo.parkingVerifiedAt })}{" "}
          {t("access.transport.car.checkSigns")}
        </p>
        <p className="access-directions__notice">{t("access.transport.publicTransport")}</p>
      </section>

      <section className="access-directions__section" aria-labelledby="access-station-heading">
        <Text as="h2" id="access-station-heading" textStyle="t7Bold">
          {t("access.transport.stationTitle")}
        </Text>
        <div className="access-directions__grid">
          <DirectionCard
            label={t("access.transport.bus.label")}
            title={t("access.transport.bus.title", { stand: accessInfo.busStand })}
          >
            <strong>{t("access.transport.bus.operator")}</strong>
            <ul>
              <li>{t("access.transport.bus.takeda", { routes: accessInfo.busRoutes.takeda })}</li>
              <li>{t("access.transport.bus.sekisuiji", { routes: accessInfo.busRoutes.sekisuiji })}</li>
            </ul>
            <p>{t("access.transport.bus.alight")}</p>
            <a className="access-direction__link" href={accessInfo.busGuideUrl} target="_blank" rel="noreferrer">
              {t("access.transport.bus.link")}
            </a>
          </DirectionCard>
          <DirectionCard
            label={t("access.transport.walk.label")}
            title={t("access.transport.walk.title", { minutes: accessInfo.walkingMinutes })}
          >
            <p>{t("access.transport.walk.body")}</p>
            <a className="access-direction__link" href={accessInfo.walkingRouteUrl} target="_blank" rel="noreferrer">
              {t("access.transport.walk.link")}
            </a>
          </DirectionCard>
        </div>
      </section>

      <p className="access-directions__source">
        {t("access.transport.sourceLabel")}{" "}
        <a href={accessInfo.eventSourceUrl} target="_blank" rel="noreferrer">{t("access.transport.eventSource")}</a>
        {" / "}
        <a href={accessInfo.universitySourceUrl} target="_blank" rel="noreferrer">{t("access.transport.universitySource")}</a>
      </p>
    </div>
  );
}
