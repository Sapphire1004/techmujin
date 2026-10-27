import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isI18nEnabled,
  languageOptions,
  type SupportedLanguage,
} from "../i18n";

export type AppView = "program" | "access" | "venue";

type AppHeaderProps = {
  activeView: AppView;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  onViewChange: (view: AppView) => void;
};

type LanguageSwitchProps = Pick<
  AppHeaderProps,
  "currentLanguage" | "onLanguageChange"
>;

function LanguageSwitch({
  currentLanguage,
  onLanguageChange,
}: LanguageSwitchProps) {
  const { t } = useTranslation();

  if (!isI18nEnabled) return null;

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
          onClick={() => onLanguageChange(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AppHeader({
  activeView,
  currentLanguage,
  onLanguageChange,
  onViewChange,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const programMenuButtonRef = useRef<HTMLButtonElement>(null);
  const accessMenuButtonRef = useRef<HTMLButtonElement>(null);
  const venueMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  const openMenu = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    dialog.showModal();
    setIsMenuOpen(true);
    window.requestAnimationFrame(() => {
      const target = {
        program: programMenuButtonRef.current,
        access: accessMenuButtonRef.current,
        venue: venueMenuButtonRef.current,
      }[activeView];
      target?.focus({ preventScroll: true });
    });
  };

  const changeView = (view: AppView) => {
    onViewChange(view);
    closeMenu();
  };

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) closeMenu();
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button
          className="site-header__brand"
          type="button"
          aria-label={t("navigation.brand")}
          onClick={() => changeView("program")}
        >
          <span className="site-header__brand-mark" aria-hidden="true">
            TM
          </span>
        </button>

        <div className="site-header__desktop">
          <nav className="site-header__nav" aria-label={t("navigation.label")}>
            <button
              type="button"
              data-active={activeView === "program"}
              aria-current={activeView === "program" ? "page" : undefined}
              aria-controls="program-panel"
              onClick={() => onViewChange("program")}
            >
              {t("navigation.program")}
            </button>
            <button
              type="button"
              data-active={activeView === "access"}
              aria-current={activeView === "access" ? "page" : undefined}
              aria-controls="access-panel"
              onClick={() => onViewChange("access")}
            >
              {t("navigation.access")}
            </button>
            <button
              type="button"
              data-active={activeView === "venue"}
              aria-current={activeView === "venue" ? "page" : undefined}
              aria-controls="venue-panel"
              onClick={() => onViewChange("venue")}
            >
              {t("navigation.venue")}
            </button>
          </nav>
          <LanguageSwitch
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
          />
        </div>

        <button
          className="site-header__menu-button"
          type="button"
          aria-label={t("navigation.openMenu")}
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <dialog
        className="site-menu"
        id="mobile-navigation"
        ref={dialogRef}
        aria-labelledby="mobile-navigation-title"
        onCancel={() => setIsMenuOpen(false)}
        onClose={() => setIsMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="site-menu__surface">
          <div className="site-menu__heading">
            <strong id="mobile-navigation-title">{t("navigation.menuTitle")}</strong>
            <button
              className="site-menu__close"
              type="button"
              aria-label={t("navigation.closeMenu")}
              onClick={closeMenu}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav className="site-menu__nav" aria-label={t("navigation.label")}>
            <button
              ref={programMenuButtonRef}
              type="button"
              data-active={activeView === "program"}
              aria-current={activeView === "program" ? "page" : undefined}
              aria-controls="program-panel"
              onClick={() => changeView("program")}
            >
              {t("navigation.program")}
            </button>
            <button
              ref={accessMenuButtonRef}
              type="button"
              data-active={activeView === "access"}
              aria-current={activeView === "access" ? "page" : undefined}
              aria-controls="access-panel"
              onClick={() => changeView("access")}
            >
              {t("navigation.access")}
            </button>
            <button
              ref={venueMenuButtonRef}
              type="button"
              data-active={activeView === "venue"}
              aria-current={activeView === "venue" ? "page" : undefined}
              aria-controls="venue-panel"
              onClick={() => changeView("venue")}
            >
              {t("navigation.venue")}
            </button>
          </nav>

          {isI18nEnabled && (
            <div className="site-menu__meta">
            <LanguageSwitch
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
            </div>
          )}
        </div>
      </dialog>
    </header>
  );
}
