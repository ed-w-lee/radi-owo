import { settings } from '../../lib/settings';
import { login } from '../net';
import { CLEAN_STATE, SetStateFn, State } from '../state';
import { setStorageState } from '../storage';
import { hideAllExcept } from './util';

const submitHandler = async (setState: SetStateFn) => {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const { elements } = form;
  console.log(elements);
  const emailValue = (elements.namedItem('email') as HTMLInputElement).value;
  const passwordValue = (elements.namedItem('password') as HTMLInputElement).value;
  login(emailValue, passwordValue).then(async (obj) => {
    if (typeof (obj) === 'string') {
      console.error('[popup] login failure:', obj.toString());
    } else {
      // successful signup or login
      // reset all state
      const state: State = {
        ...CLEAN_STATE,
        authToken: obj.authToken,
        user: obj.user,
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
};

export const initLoginPage = (setState: SetStateFn) => {
  // set signup link in JS so we can dynamically change it depending on environment
  const signupLink = document.getElementById('signup-link') as HTMLLinkElement;
  signupLink.href = `${settings.WEB_SERVER}/signup`;
  // add handlers
  const form = document.getElementById('login-form') as HTMLFormElement;
  const loginButton = document.querySelector('#login-form .login') as HTMLButtonElement;
  loginButton.addEventListener('click', () => submitHandler(setState));
  form.onsubmit = preventDefault;
};
