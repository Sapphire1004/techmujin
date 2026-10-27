import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

export type QrErrorCode =
  | "cameraDenied"
  | "cameraNotFound"
  | "cameraNotReadable"
  | "cameraFailed"
  | "imageInvalidType"
  | "imageTooLarge"
  | "imageNoQr";

export class QrReaderError extends Error {
  code: QrErrorCode;

  constructor(code: QrErrorCode) {
    super(code);
    this.code = code;
  }
}

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

export async function decodeQrImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new QrReaderError("imageInvalidType");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new QrReaderError("imageTooLarge");
  }

  const url = URL.createObjectURL(file);
  try {
    const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
    return result.getText();
  } catch {
    throw new QrReaderError("imageNoQr");
  } finally {
    URL.revokeObjectURL(url);
  }
}
