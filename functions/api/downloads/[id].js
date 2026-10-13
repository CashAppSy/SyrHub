import {handleDownload} from '../../../server/app-downloads.mjs';
export const onRequest=({request,env,params})=>handleDownload(request,env,params.id);
