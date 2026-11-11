import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isI18nEnabled,
  languageOptions,
  type SupportedLanguage,
} from "../i18n";
import type { AppView } from "../navigation";

export type { AppView } from "../navigation";

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

function HeaderBrand({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      className="site-header__brand"
      type="button"
      aria-label={t("navigation.brand")}
      onClick={onClick}
    >
      <span className="site-header__brand-ja">テック無尽</span>
      <span className="site-header__brand-en">TECH MUJIN 2026</span>
    </button>
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const programMenuButtonRef = useRef<HTMLButtonElement>(null);
  const accessMenuButtonRef = useRef<HTMLButtonElement>(null);
  const venueMenuButtonRef = useRef<HTMLButtonElement>(null);
  const rallyMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 40);

  const closeMenu = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    setIsMenuOpen(false);
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
        "stamp-rally": rallyMenuButtonRef.current,
      }[activeView];
      target?.focus({ preventScroll: true });
    });
  };

  const changeView = (view: AppView) => {
    onViewChange(view);
    closeMenu();
  };

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) closeMenu();
    };

    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const update = () => {
      const shell = document.querySelector('.app-frame[data-active-view="program"] > .app-shell');
      setIsScrolled(window.scrollY > 40 || (shell?.scrollTop ?? 0) > 40);
    };
    update();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", update, true);
  }, [activeView]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const shell = document.querySelector<HTMLElement>('.app-frame[data-active-view="program"] > .app-shell');
    const shellOverflow = shell?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (shell) shell.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (shell) shell.style.overflow = shellOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header className="site-header" data-scrolled={isScrolled}>
      <div className="site-header__inner">
        <HeaderBrand onClick={() => changeView("program")} />

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
            <button
              type="button"
              data-active={activeView === "stamp-rally"}
              aria-current={activeView === "stamp-rally" ? "page" : undefined}
              aria-controls="stamp-rally-panel"
              onClick={() => onViewChange("stamp-rally")}
            >
              {t("navigation.stampRally")}
            </button>
          </nav>
          <LanguageSwitch
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
          />
        </div>

        <button
          ref={menuButtonRef}
          className="site-header__menu-button"
          type="button"
          aria-label={t("navigation.openMenu")}
          aria-controls="mobile-navigation"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h16M4 15h16" />
          </svg>
        </button>
      </div>

      <dialog
        className="site-menu"
        id="mobile-navigation"
        ref={dialogRef}
        aria-label={t("navigation.menuTitle")}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="site-menu__surface">
          <div className="site-menu__heading">
            <HeaderBrand onClick={() => changeView("program")} />
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
            <button
              ref={rallyMenuButtonRef}
              type="button"
              data-active={activeView === "stamp-rally"}
              aria-current={activeView === "stamp-rally" ? "page" : undefined}
              aria-controls="stamp-rally-panel"
              onClick={() => changeView("stamp-rally")}
            >
              {t("navigation.stampRally")}
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
