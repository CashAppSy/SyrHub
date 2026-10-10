import {config} from '../../../server/admin.mjs';
export const onRequestGet=({env})=>config(env);
