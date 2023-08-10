import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateWaitingUserInput {
  @IsString()
  @IsOptional()
  matchId?: string;

  @IsBoolean()
  @IsOptional()
  isMatchApproved?: boolean;

  @IsString()
  socketId: string;
}
