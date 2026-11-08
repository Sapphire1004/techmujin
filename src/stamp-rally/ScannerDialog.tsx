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
import type { StampScanResult } from "./rally";

type CameraState = "off" | "starting" | "on";

export function ScannerDialog({
  onScan,
  onClose,
}: {
  onScan: (payload: string) => StampScanResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const handledRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [feedback, setFeedback] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

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

  const acceptPayload = useCallback(
    (payload: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      stopCamera();
      setCameraState("off");

      const result = onScan(payload);
      const spot = result.spot?.title ?? "";
      const key =
        result.kind === "added"
          ? "rally.scanner.added"
          : result.kind === "duplicate"
            ? "rally.scanner.duplicate"
            : result.kind === "not-joined"
              ? "rally.scanner.notJoined"
              : "rally.scanner.invalid";

      setFeedback({
        message: t(key, { spot }),
        success: result.kind === "added" || result.kind === "duplicate",
      });
    },
    [onScan, stopCamera, t],
  );

  const enableCamera = async () => {
    stopCamera();
    handledRef.current = false;
    setFeedback(null);

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
            {t("rally.scanner.title")}
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

      {feedback?.success && (
        <ActionButton
          className="rally-dialog__action"
          variant="neutralWeak"
          size="large"
          type="button"
          onClick={onClose}
        >
          {t("rally.scanner.viewCard")}
        </ActionButton>
      )}

      <p className="rally-dialog__privacy">{t("rally.scanner.privacy")}</p>
    </dialog>
  );
}
