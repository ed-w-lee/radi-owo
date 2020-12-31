import { settings } from "../settings";

const handleError = (response: Response): Promise<string> => response.json()
  .then((obj) => obj.message)
  .catch(() => response.text()
    .then((obj) => obj)
    .catch(() => 'failed for unknown reason'));

export type RoomInfo = {
  id: string,
  name: string,
  hostName?: string,
};
export const getRooms = async (): Promise<RoomInfo[]> => {
  const response = await fetch(`${settings.API_SERVER}/rooms`);
  return new Promise((res, rej) => {
    if (!response.ok) {
      rej(handleError(response));
    }
    res(response.json());
  });
};
