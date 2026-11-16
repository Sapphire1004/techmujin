import { Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";

const ZONE_IDS = ["stage", "booths", "communication"] as const;

function ZoneIcon({ id }: { id: (typeof ZONE_IDS)[number] }) {
  return (
    <svg className="venue-zone__icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {id === "stage" ? (
        <>
          <rect className="venue-zone__tint" x="18" y="6" width="12" height="20" rx="6" />
          <rect x="18" y="6" width="12" height="20" rx="6" />
          <path d="M12 21a12 12 0 0 0 24 0M24 33v7M17 42h14" />
        </>
      ) : id === "booths" ? (
        <>
          <circle cx="16" cy="13" r="4.5" />
          <path d="M7 28c0-5 4-9 9-9s9 4 9 9" />
          <rect className="venue-zone__tint" x="28" y="10" width="13" height="18" rx="1.5" />
          <rect x="28" y="10" width="13" height="18" rx="1.5" />
          <path d="M31 15h7M31 19h5M4 28h40v6H4zM8 34v8M40 34v8" />
        </>
      ) : (
        <>
          <path className="venue-zone__tint" d="M17 5h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-2 3-2-3h-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" />
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

export function VenueZones() {
  const { t } = useTranslation();
  return (
    <section className="venue-zones" aria-labelledby="venue-zones-heading">
      <Text as="h2" id="venue-zones-heading" textStyle="t6Bold">{t("venue.zones.title")}</Text>
      <ul className="venue-zone-list">
        {ZONE_IDS.map((id) => (
          <li className="venue-zone" key={id}>
            <ZoneIcon id={id} />
            <Text as="h3" textStyle="t5Bold">{t(`venue.zones.${id}.name`)}</Text>
            <p className="venue-zone__place">{t(`venue.zones.${id}.place`)}</p>
            <p className="venue-zone__description">{t(`venue.zones.${id}.description`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
