import { IsString } from 'class-validator';

export class FindWaitingUserInput {
  @IsString()
  socketId: string;
}
