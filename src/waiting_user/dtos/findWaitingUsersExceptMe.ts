import { IsString } from 'class-validator';

export class FindWaitingUsersExceptMeInput {
  @IsString()
  mySocketId: string;
}
