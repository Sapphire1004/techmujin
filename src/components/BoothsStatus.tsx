import { ActionButton, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import type { BoothsState } from "../hooks/useBooths";

export function BoothsStatus({ state }: { state: BoothsState }) {
  const { t } = useTranslation();
  return (
    <div className="venue-state" role={state.status === "error" ? "alert" : "status"}>
      <Text as="p" textStyle="t4Regular">{t(`booths.${state.status === "success" ? "empty" : state.status}`)}</Text>
      {state.status === "error" && (
        <ActionButton variant="brandSolid" size="small" type="button" onClick={state.retry}>
          {t("booths.retry")}
        </ActionButton>
      )}
    </div>
  );
}
