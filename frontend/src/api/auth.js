import { request } from './client.js';

export const getSession = () => request('auth/session/');
export const signIn = (username, password) => request('auth/login/', { method: 'POST', body: { username, password } });
export const signOut = () => request('auth/logout/', { method: 'POST' });
