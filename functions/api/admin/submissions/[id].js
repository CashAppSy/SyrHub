import {handleAdmin} from '../../../../server/admin.mjs';
export const onRequest=({request,env,params})=>handleAdmin(request,env,params.id);
