import { settings } from '../lib/settings';

export type UserInfo = {
  id: string,
  displayName: string,
  email: string,
}

export type RoomInfo = {
  id: string,
  name: string,
}

export type LoginInfo = {
  authToken: string,
  user: UserInfo,
};

const handleError = (response: Response): Promise<string> => response.json()
  .then((obj) => obj.message)
  .catch(() => response.text()
    .then((obj) => obj)
    .catch(() => 'failed for unknown reason'));

export const login = async (email: string, password: string): Promise<LoginInfo | string> => {
  console.log(JSON.stringify({
    email,
    password,
  }));
  const response = await fetch(`${settings.API_SERVER}/my/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  console.log(response);
  if (!response.ok) {
    return handleError(response);
  }
  return response.json().then((loggedInResponse) => {
    const toRet = {
      authToken: loggedInResponse.token,
      user: loggedInResponse.result,
    };
    return toRet;
  });
};

export const signup = async (email: string, password: string): Promise<LoginInfo | string> => {
  const response = await fetch(`${settings.API_SERVER}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  if (!response.ok) {
    return handleError(response);
  }
  return response.json().then((loggedInResponse) => {
    const toRet = {
      authToken: loggedInResponse.token,
      user: loggedInResponse.result,
    };
    return toRet;
  });
};

export type GetRoomsResponse = RoomInfo[] | 'AuthError' | string;

export const getMyRooms = async (userToken: string): Promise<GetRoomsResponse> => {
  const response = await fetch(`${settings.API_SERVER}/my/rooms`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      // unauthorized
      return 'AuthError';
    }
    return handleError(response);
  }
  return response.json();
};

export const createRoom = async (userToken: string, name: string): Promise<RoomInfo | string> => {
  const response = await fetch(`${settings.API_SERVER}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      return 'AuthError';
    }
    return handleError(response);
  }
  return response.json().then((roomResponse) => {
    const toRet = {
      name: roomResponse.room_name,
      id: roomResponse.id,
    };
    return toRet;
  });
};

export const deleteRoom = async (userToken: string, roomId: string) => {
  const response = await fetch(`${settings.API_SERVER}/rooms/${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      return 'AuthError';
    }
    return handleError(response);
  }
  return null;
};
