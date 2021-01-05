export type Settings = {
  API_SERVER: string,
  WS_SERVER: string,
  WEB_SERVER: string,
  WS_KEEPALIVE_MS: number,
};

let mySettings: Settings;

switch (process.env.ENV) {
  case 'production': {
    mySettings = {
      API_SERVER: 'http://TODO',
      WS_SERVER: 'ws://TODO',
      WEB_SERVER: 'http://TODO',
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  case 'localdev': {
    mySettings = {
      API_SERVER: 'http://localhost:3030',
      WS_SERVER: 'ws://localhost:3030',
      WEB_SERVER: 'http://localhost:5000',
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  case 'remotedev': {
    mySettings = {
      API_SERVER: 'http://192.168.1.128:58008/api',
      WS_SERVER: 'ws://192.168.1.128:58008/ws',
      WEB_SERVER: 'http://192.168.1.128:58008',
      WS_KEEPALIVE_MS: 10000,
    };
    break;
  }
  default:
    throw new Error('bad settings rip');
}

export const settings = mySettings;
