import { browser } from 'webextension-polyfill-ts';
import { FromBackgroundMessage, ToBackgroundMessage } from '../../lib/types';

export type SectionId = 'login-section' | 'room-selection' | 'room-information';
const sectionIDList: SectionId[] = ['login-section', 'room-selection', 'room-information'];

export const hideAllExcept = (id: SectionId) => {
  sectionIDList.forEach((section) => {
    if (section === id) {
      document.getElementById(section)!.removeAttribute('hidden');
    } else {
      document.getElementById(section)!.setAttribute('hidden', 'hidden');
    }
  });
};

export const bgPingPong = async (
  toSend: ToBackgroundMessage,
  handler: (msg: FromBackgroundMessage) => void,
) => {
  const port = browser.runtime.connect(undefined, {
    name: 'popup',
  });
  port.onMessage.addListener((message) => {
    port.disconnect();
    handler(message);
  });
  port.postMessage(toSend);
};
