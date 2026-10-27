import { useTranslation } from "react-i18next";
import {
  isI18nEnabled,
  languageOptions,
  saveLanguage,
  type SupportedLanguage,
} from "./i18n";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  if (!isI18nEnabled) return null;

  const currentLanguage = (i18n.resolvedLanguage ?? "ja").split(
    "-",
  )[0] as SupportedLanguage;

  const changeLanguage = (language: SupportedLanguage) => {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  };

  return (
    <div
      className="language-switch"
      role="group"
      aria-label={t("language.selector")}
    >
      {languageOptions.map(({ code, label }) => (
        <button
          className="language-switch__button"
          data-active={currentLanguage === code}
          type="button"
          key={code}
          aria-pressed={currentLanguage === code}
          onClick={() => changeLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
