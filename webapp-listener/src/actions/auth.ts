import { settings } from "../settings";
import type { UserStore } from "../store";
import { handleError } from "./util";

export const signup = async (displayName: string, email: string, password: string): Promise<UserStore> => {
  const response = await fetch(`${settings.API_SERVER}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: displayName,
      email,
      password,
    }),
  });

  return new Promise((res, rej) => {
    if (!response.ok) {
      rej(handleError(response));
    }
    response.json().then((result: UserStore) => {
      res(result);
    }).catch((reason) => rej(reason));
  });
};

export const login = async (email: string, password: string): Promise<UserStore> => {
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

  return new Promise((res, rej) => {
    if (!response.ok) {
      rej(handleError(response));
    }
    response.json().then((result: UserStore) => {
      res(result);
    }).catch((reason) => rej(reason));
  });
};
