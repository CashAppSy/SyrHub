import {handleAdmin} from '../../../server/admin.mjs';
export const onRequest=({request,env})=>handleAdmin(request,env);
