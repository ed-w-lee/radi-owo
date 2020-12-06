// @ts-nocheck

export default function captureStream(element: HTMLMediaElement): MediaStream {
  if (element.mozCaptureStream) {
    stream = element.mozCaptureStream();
  } else {
    stream = element.captureStream();
  }
  return stream;
}