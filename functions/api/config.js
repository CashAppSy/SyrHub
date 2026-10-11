import {publicConfig} from '../../server/user-auth.mjs';
export const onRequestGet=({env})=>publicConfig(env);
