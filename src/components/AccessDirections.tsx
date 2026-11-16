import { Trans, useTranslation } from "react-i18next";
import { accessInfo } from "../data/access";

export function AccessDirections() {
  const { t } = useTranslation();
  return (
    <div className="access-directions">
      <dl className="access-routes" aria-label={t("access.transport.routesLabel")}>
        {accessInfo.routeIds.map((id) => (
          <div className="access-route" key={id}>
            <dt>{t(`access.transport.${id}.label`)}</dt>
            <dd>
              <Trans
                i18nKey={`access.transport.${id}.body`}
                components={{
                  part: <span className="access-route__part" />,
                  phrase: <span className="access-route__phrase" />,
                }}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
