import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

export type QrErrorCode =
  | "cameraDenied"
  | "cameraNotFound"
  | "cameraNotReadable"
  | "cameraFailed";

export function getCameraErrorCode(error: unknown): QrErrorCode {
  if (error instanceof Error || error instanceof DOMException) {
    if (
      ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(
        error.name,
      )
    ) {
      return "cameraDenied";
    }
    if (["NotFoundError", "DevicesNotFoundError"].includes(error.name)) {
      return "cameraNotFound";
    }
    if (["NotReadableError", "TrackStartError"].includes(error.name)) {
      return "cameraNotReadable";
    }
  }
  return "cameraFailed";
}

export async function startQrCamera(
  video: HTMLVideoElement,
  onDecode: (payload: string) => void,
  signal: AbortSignal,
) {
  if (signal.aborted) return;

  let stream: MediaStream | undefined;
  let controls: IScannerControls | undefined;
  const scannerVideo = document.createElement("video");
  const stop = () => {
    controls?.stop();
    stream?.getTracks().forEach((track) => track.stop());
    if (stream && video.srcObject === stream) video.srcObject = null;
  };

  signal.addEventListener("abort", stop, { once: true });

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    if (signal.aborted) return stop();

    video.srcObject = stream;
    await video.play();
    if (signal.aborted) return stop();

    controls = await new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 250,
      delayBetweenScanSuccess: 1000,
    }).decodeFromStream(stream, scannerVideo, (result) => {
      if (result && !signal.aborted) onDecode(result.getText());
    });

    if (signal.aborted) stop();
  } catch (error) {
    stop();
    signal.removeEventListener("abort", stop);
    if (!signal.aborted) throw error;
  }
}
