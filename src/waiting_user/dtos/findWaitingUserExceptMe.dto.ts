import { IsString } from 'class-validator';

export class FindWaitingUserByMatchIdExceptMeInput {
  @IsString()
  mySocketId: string;

  @IsString()
  matchId: string;
}
