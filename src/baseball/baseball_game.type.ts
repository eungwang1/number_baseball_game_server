import { BroadcastOperator, Socket } from 'socket.io';
import {
  DecorateAcknowledgementsWithMultipleResponses,
  DefaultEventsMap,
} from 'socket.io/dist/typed-events';

export interface EmitErrorArgs {
  destinaton:
    | Socket
    | BroadcastOperator<
        DecorateAcknowledgementsWithMultipleResponses<DefaultEventsMap>,
        any
      >;
  message: string;
  statusCode: number;
}
