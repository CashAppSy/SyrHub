import {handle} from '../../server/submissions.mjs';
export const onRequest = ({request,env}) => handle(request,env);
