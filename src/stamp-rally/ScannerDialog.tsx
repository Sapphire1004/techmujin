import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActionButton, Text } from "@seed-design/react";
import { useTranslation } from "react-i18next";
import {
  getCameraErrorCode,
  startQrCamera,
} from "./qr";
import { STAMP_SPOTS } from "./rally";
import type { StampSaveResult } from "./useStampCard";

type CameraState = "off" | "starting" | "on";

export function ScannerDialog({
  onScan,
  onClose,
  onViewCard,
}: {
  onScan: (payload: string) => StampSaveResult;
  onClose: () => void;
  onViewCard: (spotId?: string) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const handledRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [feedback, setFeedback] = useState<{
    message: string;
    success: boolean;
  } | null>(null);
  const [scanResult, setScanResult] = useState<(StampSaveResult & { payload: string }) | null>(null);

  const stopCamera = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    clearTimeout(hintTimerRef.current);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();

    // 開いた直後に起動します。StrictModeの再実行で権限要求を重複させません。
    let active = true;
    queueMicrotask(() => {
      if (active && document.visibilityState !== "hidden") void enableCamera();
    });

    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        stopCamera();
        setCameraState("off");
      }
    };
    const stopWhenLeaving = () => stopCamera();

    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopWhenLeaving);

    return () => {
      active = false;
      stopCamera();
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopWhenLeaving);
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!scanResult) return;
    if (dialogRef.current) dialogRef.current.scrollTop = 0;
    resultTitleRef.current?.focus({ preventScroll: true });
  }, [scanResult]);

  const acceptPayload = useCallback(
    (payload: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      stopCamera();
      setCameraState("off");

      setFeedback(null);
      setScanResult({ ...onScan(payload), payload });
    },
    [onScan, stopCamera],
  );

  const enableCamera = async () => {
    stopCamera();
    handledRef.current = false;
    setFeedback(null);
    setScanResult(null);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setFeedback({ message: t("rally.scanner.cameraUnavailable"), success: false });
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setCameraState("starting");

    try {
      await startQrCamera(video, acceptPayload, controller.signal);
      if (controller.signal.aborted) return;
      setCameraState("on");
      hintTimerRef.current = setTimeout(() => {
        setFeedback({ message: t("rally.scanner.noResult"), success: false });
      }, 15_000);
    } catch (error) {
      if (controller.signal.aborted) return;
      stopCamera();
      setCameraState("off");
      setFeedback({
        message: t(`rally.scanner.${getCameraErrorCode(error)}`),
        success: false,
      });
    }
  };

  const validResult = scanResult?.kind === "added" || scanResult?.kind === "duplicate";
  const saveFailed = validResult && !scanResult?.persisted;
  const resultState = saveFailed ? "save-error" : scanResult?.kind;
  const resultTitleKey = saveFailed
    ? "rally.scanner.saveFailedTitle"
    : scanResult?.kind === "added"
      ? "rally.scanner.addedTitle"
      : scanResult?.kind === "duplicate"
        ? "rally.scanner.duplicateTitle"
        : scanResult?.kind === "not-joined"
          ? "rally.scanner.notJoined"
          : "rally.scanner.invalidTitle";
  const returnToCard = () => onViewCard(
    scanResult?.persisted && scanResult.kind === "added" ? scanResult.spot?.id : undefined,
  );
  const retrySave = () => {
    if (!scanResult) return;
    const retried = onScan(scanResult.payload);
    setScanResult({
      ...retried,
      // 再試行で重複判定になっても、最初の取得結果として表示します。
      kind: scanResult.kind === "added" && retried.kind === "duplicate" ? "added" : retried.kind,
      payload: scanResult.payload,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="rally-dialog"
      aria-label={t("rally.scanner.title")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="rally-dialog__heading">
        <div>
          <span className="rally-eyebrow">TECHMUJIN STAMP RALLY</span>
          <Text as="h2" textStyle="t7Bold">
            {t(scanResult ? "rally.scanner.title" : "rally.scanner.scanTitle")}
          </Text>
        </div>
        <button
          className="rally-dialog__close"
          type="button"
          aria-label={t("rally.scanner.close")}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="rally-dialog__camera" hidden={Boolean(scanResult)}>
        <p className="rally-dialog__intro">{t("rally.scanner.description")}</p>

        <div className="rally-viewfinder">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label={t("rally.scanner.cameraPreview")}
            data-hidden={cameraState === "off"}
          />
          <div className="rally-viewfinder__frame" aria-hidden="true" />
          {cameraState === "off" ? (
            <div className="rally-viewfinder__placeholder">
              <span aria-hidden="true">⌗</span>
              <p>{t("rally.scanner.cameraFrame")}</p>
            </div>
          ) : (
            <span className="rally-viewfinder__status">
              {t(
                cameraState === "starting"
                  ? "rally.scanner.connecting"
                  : "rally.scanner.searching",
              )}
            </span>
          )}
        </div>
        <ActionButton
          className="rally-dialog__action"
          variant="brandSolid"
          size="large"
          type="button"
          onClick={() => {
            if (cameraState === "off") void enableCamera();
            else {
              stopCamera();
              setCameraState("off");
            }
          }}
        >
          {t(
            cameraState === "off"
              ? "rally.scanner.cameraOn"
              : "rally.scanner.cameraOff",
          )}
        </ActionButton>
        <p className="rally-dialog__fineprint">
          {t("rally.scanner.permission")}
        </p>

        {feedback && (
          <div
            className="rally-feedback"
            data-success={feedback.success}
            role={feedback.success ? "status" : "alert"}
          >
            {feedback.message}
          </div>
        )}

        <p className="rally-dialog__privacy">{t("rally.scanner.privacy")}</p>
      </div>

      {scanResult && (
        <section
          className="rally-scan-result"
          data-kind={resultState}
          data-tone={saveFailed ? "critical" : scanResult.kind === "added" ? "brand" : "neutral"}
          role={validResult && !saveFailed ? "status" : "alert"}
          aria-labelledby="rally-scan-result-title"
        >
          <div className="rally-scan-result__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {validResult && !saveFailed ? <path d="m5 12 4 4L19 6" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7h.01" /></>}
            </svg>
          </div>
          <h3 id="rally-scan-result-title" ref={resultTitleRef} tabIndex={-1}>{t(resultTitleKey)}</h3>
          {scanResult.spot && <p className="rally-scan-result__spot">{scanResult.spot.title}</p>}
          {(saveFailed || scanResult.kind === "duplicate" || scanResult.kind === "invalid") && (
            <p className="rally-scan-result__message">{t(
              saveFailed ? "rally.scanner.saveFailedDescription"
                : scanResult.kind === "duplicate" ? "rally.scanner.duplicateDescription"
                  : "rally.scanner.invalid",
            )}</p>
          )}
          {validResult && !saveFailed && (
            <div className="rally-scan-result__progress">
              <div><strong>{Object.keys(scanResult.card.visits).length}</strong><span> / {STAMP_SPOTS.length}</span></div>
              <p>{t("rally.scanner.collectedCount")}</p>
            </div>
          )}
          <div className="rally-scan-result__actions">
            <ActionButton variant="brandSolid" size="large" type="button" onClick={
              saveFailed ? retrySave : validResult ? returnToCard : () => void enableCamera()
            }>
              {t(saveFailed ? "rally.link.retry" : validResult ? "rally.scanner.viewCard" : "rally.scanner.retry")}
            </ActionButton>
            {(!validResult || saveFailed) && (
              <ActionButton variant="neutralWeak" size="large" type="button" onClick={returnToCard}>
                {t("rally.scanner.viewCard")}
              </ActionButton>
            )}
          </div>
        </section>
      )}
    </dialog>
  );
}
