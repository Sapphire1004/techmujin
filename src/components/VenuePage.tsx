import { Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import { venueGuideResult } from "../data/venue";
import type { BoothsState } from "../hooks/useBooths";
import { VenueGuide } from "./VenueGuide";

export function VenuePage({ view, booths }: { view: "access" | "venue"; booths: BoothsState }) {
  const { t } = useTranslation();
  return (
    <div className={view === "access" ? "app-shell app-shell--access" : "app-shell"}>
      <header className="masthead">
        <div className="masthead__title-row">
          <Text as="h1" textStyle="screenTitle">
            {t(view === "access" ? "access.heroTitle" : "venue.heroTitle")}
          </Text>
          {view === "access" && venueGuideResult.success && (
            <a
              className="venue-summary__map-link"
              href={venueGuideResult.data.venue.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("venue.openGoogleMaps")}
            </a>
          )}
        </div>
        <div className="masthead__utility-row">
          <Text as="p" className="masthead__note" color="fg.neutralMuted" textStyle="t4Regular">
            {t(view === "access" ? "access.heroNote" : "venue.heroNote")}
          </Text>
        </div>
      </header>
      <main>
        <div id={`${view}-panel`} className="app-panel">
          <VenueGuide view={view === "access" ? "access" : "interior"} booths={booths} />
        </div>
      </main>
    </div>
  );
}
