import {handleMySubmissions} from '../../server/my-submissions.mjs';
export const onRequest=({request,env})=>handleMySubmissions(request,env);
