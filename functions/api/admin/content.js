import {handleContent} from '../../../server/content-admin.mjs';
export const onRequest=({request,env})=>handleContent(request,env);
