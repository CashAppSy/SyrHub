import {handleNotifications} from '../../server/notifications.mjs';
export const onRequest=context=>handleNotifications(context.request,context.env,context);
