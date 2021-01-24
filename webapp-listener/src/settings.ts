export type Settings = {
  API_SERVER: string,
  WS_SERVER: string,
  FFT_SIZE: number,
};

let mySettings: Settings;

// replaced with correct environment in Rollup
declare const __MYENV__;

switch (__MYENV__) {
  case 'production': {
    mySettings = {
      API_SERVER: 'http://TODO',
      WS_SERVER: 'ws://TODO',
      FFT_SIZE: 32,
    };
    break;
  }
  case 'localdev': {
    mySettings = {
      API_SERVER: 'http://localhost:3030',
      WS_SERVER: 'ws://localhost:3030',
      FFT_SIZE: 32,
    };
    break;
  }
  case 'remotedev': {
    mySettings = {
      API_SERVER: '/api',
      WS_SERVER: 'ws://192.168.1.128:58008/ws',
      FFT_SIZE: 32,
    };
    break;
  }
  default:
    throw new Error('bad settings rip');
}

export const settings = mySettings;
