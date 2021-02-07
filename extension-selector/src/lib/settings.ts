export type Settings = {
  API_SERVER: string,
  WS_SERVER: string,
  WEB_SERVER: string,
  TURN_SERVER: string | null,
  WS_KEEPALIVE_MS: number,
  DEBUG: boolean,
};

let mySettings: Settings;

switch (process.env.ENV) {
  case 'production': {
    mySettings = {
      API_SERVER: 'http://TODO',
      WS_SERVER: 'ws://TODO',
      WEB_SERVER: 'http://TODO',
      TURN_SERVER: 'turn:TODO',
      WS_KEEPALIVE_MS: 10000,
      DEBUG: false,
    };
    break;
  }
  case 'localdev': {
    mySettings = {
      API_SERVER: 'http://localhost:3030',
      WS_SERVER: 'ws://localhost:3030',
      WEB_SERVER: 'http://localhost:5000',
      TURN_SERVER: null,
      WS_KEEPALIVE_MS: 10000,
      DEBUG: true,
    };
    break;
  }
  case 'remotedev': {
    mySettings = {
      API_SERVER: 'http://192.168.1.128:58008/api',
      WS_SERVER: 'ws://192.168.1.128:58008/ws',
      WEB_SERVER: 'http://192.168.1.128:58008',
      TURN_SERVER: null,
      WS_KEEPALIVE_MS: 10000,
      DEBUG: true,
    };
    break;
  }
  default:
    throw new Error('bad settings rip');
}

export const settings = mySettings;
