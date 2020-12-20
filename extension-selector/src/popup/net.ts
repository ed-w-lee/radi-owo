import { API_SERVER } from "../lib/constants"

export type UserInfo = {
  id: string,
  display_name: string,
  email: string,
}

export type RoomInfo = {
  id: string,
  name: string,
}

export type LoginInfo = {
  'auth-token': string,
  'user': UserInfo,
};

const handleError = (response: Response): Promise<string> => {
  return response.json().then((obj) => obj.message).catch(() => {
    response.text().then((obj) => obj).catch(() => {
      "failed for unknown reason"
    })
  });
};

export const login = async (email: string, password: string): Promise<LoginInfo | string> => {
  console.log(JSON.stringify({
    email: email,
    password: password,
  }));
  const response = await fetch(`${API_SERVER}/my/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    })
  });
  console.log(response);
  if (!response.ok) {
    return handleError(response);
  } else {
    return response.json().then((loggedInResponse) => {
      return {
        'auth-token': loggedInResponse.token,
        'user': loggedInResponse.result,
      };
    });
  }
};

export const signup = async (email: string, password: string): Promise<LoginInfo | string> => {
  const response = await fetch(`${API_SERVER}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    })
  });
  if (!response.ok) {
    return handleError(response);
  } else {
    return response.json().then((loggedInResponse) => {
      return {
        'auth-token': loggedInResponse.token,
        'user': loggedInResponse.result,
      };
    });
  }
};

export type GetRoomsResponse = RoomInfo[] | 'AuthError' | string;

export const getMyRooms = async (userToken: string): Promise<GetRoomsResponse> => {
  const response = await fetch(`${API_SERVER}/my/rooms`, {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      // unauthorized
      return 'AuthError';
    } else {
      return handleError(response);
    }
  } else {
    return response.json();
  }
}

export const createRoom = async (userToken: string, name: string): Promise<RoomInfo | string> => {
  const response = await fetch(`${API_SERVER}/rooms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
    })
  });
  if (!response.ok) {
    if (response.status === 401) {
      return 'AuthError';
    } else {
      return handleError(response);
    }
  } else {
    return response.json().then((roomResponse) => {
      return {
        name: roomResponse.room_name,
        id: roomResponse.id,
      }
    });
  }
};
