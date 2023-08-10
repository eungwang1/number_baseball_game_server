import { IsOptional, IsString } from 'class-validator';

export class FindWaitingUserInput {
  @IsString()
  @IsOptional()
  socketId?: string;

  @IsString()
  @IsOptional()
  matchId?: string;
}
