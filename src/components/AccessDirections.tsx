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
      <p className="access-directions__notice">{t("access.transport.publicTransport")}</p>

      <section className="access-directions__section" aria-labelledby="access-station-heading">
        <Text as="h2" id="access-station-heading" textStyle="t7Bold">
          {t("access.transport.stationTitle")}
        </Text>
        <div className="access-directions__grid">
          <DirectionCard
            label={t("access.transport.walk.label")}
            title={t("access.transport.walk.title", { minutes: accessInfo.walkingMinutes })}
          >
            <p>{t("access.transport.walk.body")}</p>
            <a className="access-direction__link" href={accessInfo.walkingRouteUrl} target="_blank" rel="noreferrer">
              {t("access.transport.walk.link")}
            </a>
          </DirectionCard>
          <DirectionCard
            label={t("access.transport.bus.label")}
            title={t("access.transport.bus.title", { stand: accessInfo.busStand })}
          >
            <ol>
              <li>{t("access.transport.bus.board")}</li>
              <li>{t("access.transport.bus.alight")}</li>
            </ol>
            <a className="access-direction__link" href={accessInfo.busGuideUrl} target="_blank" rel="noreferrer">
              {t("access.transport.bus.link")}
            </a>
          </DirectionCard>
        </div>
      </section>

      <section className="access-directions__section" aria-labelledby="access-arrival-heading">
        <Text as="h2" id="access-arrival-heading" textStyle="t7Bold">
          {t("access.transport.arrivalTitle")}
        </Text>
        <div className="access-directions__grid">
          <DirectionCard label={t("access.transport.train.label")} title={t("access.transport.train.title")}>
            <p>{t("access.transport.train.body", { minutes: accessInfo.trainMinutes })}</p>
            <p>{t("access.transport.train.arrival")}</p>
          </DirectionCard>
          <DirectionCard label={t("access.transport.car.label")} title={accessInfo.parking.name}>
            <strong className="access-direction__price">
              {t("access.transport.car.price", { price: accessInfo.parking.dailyPrice })}
            </strong>
            <p>{t("access.transport.car.body")}</p>
            <a className="access-direction__link" href={accessInfo.parking.mapUrl} target="_blank" rel="noreferrer">
              {t("access.transport.car.link")}
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
