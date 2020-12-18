import { login } from "../net";
import { CLEAN_STATE, SetStateFn, State } from "../state";
import { setStorageState } from "../storage";
import { hideAllExcept } from "./util";

const submitHandler = async (submitType: 'login' | 'signup', setState: SetStateFn) => {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const elements = form.elements;
  console.log(elements);
  let emailValue = (elements.namedItem('email') as HTMLInputElement).value;
  let passwordValue = (elements.namedItem('password') as HTMLInputElement).value;
  login(emailValue, passwordValue).then(async (obj) => {
    console.log('obj: ', obj);
    if (typeof (obj) === 'string') {
      console.error(obj.toString());
    } else {
      // successful signup or login
      // reset all state
      const state: State = {
        ...CLEAN_STATE,
        authToken: obj['auth-token'],
        user: obj['user'],
      };
      await setStorageState(state);

      setState(state);
    }
  });
};

const preventDefault = (ev: Event) => ev.preventDefault();

export const renderLoginPage = () => {
  // show login form
  hideAllExcept('login-section');
}

export const initLoginPage = (setState: SetStateFn) => {
  // add handlers
  const form = document.getElementById('login-form') as HTMLFormElement;
  const loginButton = document.querySelector('#login-form .login') as HTMLButtonElement;
  loginButton.addEventListener('click', () => submitHandler('login', setState));
  form.onsubmit = preventDefault;
}