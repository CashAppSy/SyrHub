import {publicCatalog} from '../../server/catalog.mjs';
export const onRequestGet=({env})=>publicCatalog(env);
