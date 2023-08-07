import { IsString } from 'class-validator';

export class DeleteWaitingUserInput {
  @IsString()
  socketId: string;
}
