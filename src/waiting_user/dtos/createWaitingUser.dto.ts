import { IsString } from 'class-validator';

export class CreateWaitingUserInput {
  @IsString()
  socketId: string;
}
