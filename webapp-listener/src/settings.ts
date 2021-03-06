export type Settings = {
  API_SERVER: string,
  WS_SERVER: string,
  ICE_SERVER: string | null,
  FFT_SIZE: number,
  WS_KEEPALIVE_MS: number,
};

let mySettings: Settings;

// replaced with correct environment in Rollup
declare const __MYENV__;

switch (__MYENV__) {
  case 'production': {
    mySettings = {
      API_SERVER: '/api',
      WS_SERVER: 'wss://radiowo.edwlee.dev/ws',
      ICE_SERVER: 'turn:radiowo.edwlee.dev:3478',
      FFT_SIZE: 32,
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  case 'localdev': {
    mySettings = {
      API_SERVER: 'http://localhost:3030',
      WS_SERVER: 'ws://localhost:3030',
      ICE_SERVER: null,
      FFT_SIZE: 32,
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  case 'remotedev': {
    mySettings = {
      API_SERVER: '/api',
      WS_SERVER: 'ws://192.168.1.128:58008/ws',
      ICE_SERVER: null,
      FFT_SIZE: 32,
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  default:
    throw new Error('bad settings rip');
}

export const settings = mySettings;
