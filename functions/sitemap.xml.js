import {sitemap} from '../server/app-pages.mjs';
export const onRequestGet=({request,env})=>sitemap(request,env);
