// @ts-nocheck

export default function captureStream(element: HTMLMediaElement): MediaStream {
  let stream;
  if (element.mozCaptureStream) {
    stream = element.mozCaptureStream();
  } else {
    stream = element.captureStream();
  }
  return stream;
}
