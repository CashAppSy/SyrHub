import {appPage} from '../../server/app-pages.mjs';
export const onRequestGet=({request,env,params})=>appPage(request,env,params.id);
