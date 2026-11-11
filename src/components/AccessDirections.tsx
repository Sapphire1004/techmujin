import { Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import { accessInfo } from "../data/access";

function ZoneIcon({ id }: { id: (typeof accessInfo.zoneIds)[number] }) {
  return (
    <svg className="access-zone__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {id === "stage" ? (
        <>
          <rect className="access-zone__tint" x="18" y="6" width="12" height="20" rx="6" />
          <rect x="18" y="6" width="12" height="20" rx="6" />
          <path d="M12 21a12 12 0 0 0 24 0M24 33v7M17 42h14" />
        </>
      ) : id === "booths" ? (
        <>
          <circle cx="16" cy="13" r="4.5" />
          <path d="M7 28c0-5 4-9 9-9s9 4 9 9" />
          <rect className="access-zone__tint" x="28" y="10" width="13" height="18" rx="1.5" />
          <rect x="28" y="10" width="13" height="18" rx="1.5" />
          <path d="M31 15h7M31 19h5M4 28h40v6H4zM8 34v8M40 34v8" />
        </>
      ) : (
        <>
          <path className="access-zone__tint" d="M17 5h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-2 3-2-3h-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" />
          <path d="M17 5h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-2 3-2-3h-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" />
          <circle cx="12" cy="28" r="4" />
          <path d="M5 43c0-4.4 3.1-8 7-8s7 3.6 7 8" />
          <circle cx="36" cy="28" r="4" />
          <path d="M29 43c0-4.4 3.1-8 7-8s7 3.6 7 8" />
        </>
      )}
    </svg>
  );
}

export function AccessDirections() {
  const { t } = useTranslation();
  return (
    <div className="access-directions">
      <dl className="access-routes" aria-label={t("access.transport.routesLabel")}>
        {accessInfo.routeIds.map((id) => (
          <div className="access-route" key={id}>
            <dt>{t(`access.transport.${id}.label`)}</dt>
            <dd>{t(`access.transport.${id}.body`)}</dd>
          </div>
        ))}
      </dl>
      <section className="access-zones" aria-labelledby="access-zones-heading">
        <Text as="h2" id="access-zones-heading" textStyle="t6Bold">{t("access.transport.zones.title")}</Text>
        <ul className="access-zone-list">
          {accessInfo.zoneIds.map((id) => (
            <li className="access-zone" key={id}>
              <ZoneIcon id={id} />
              <Text as="h3" textStyle="t5Bold">{t(`access.transport.zones.${id}.name`)}</Text>
              <p className="access-zone__place">{t(`access.transport.zones.${id}.place`)}</p>
              <p className="access-zone__description">{t(`access.transport.zones.${id}.description`)}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="access-directions__source">
        <a href={accessInfo.sourceUrl} target="_blank" rel="noreferrer">{t("access.transport.sourceLink")}</a>
      </p>
    </div>
  );
}
