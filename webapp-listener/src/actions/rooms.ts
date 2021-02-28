import { settings } from "@src/settings";

import { handleError } from "./util";

type HostStatus = 'playing' | 'stopped';

export type RoomInfo = {
  id: string,
  name: string,
  hostName?: string,
  hostStatus?: HostStatus,
};

export const getRooms = async (): Promise<RoomInfo[]> => {
  const response = await fetch(`${settings.API_SERVER}/rooms`);
  return new Promise((res, rej) => {
    if (!response.ok) {
      rej(handleError(response));
    }
    response.json().then((rooms) => {
      res(rooms.map((roomInfo) => ({
        id: roomInfo.id,
        name: roomInfo.name,
        hostName: roomInfo.host_name,
        hostStatus: roomInfo.host_status,
      })));
    }).catch((reason) => rej(reason));
  });
};
