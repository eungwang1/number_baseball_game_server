import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWaitingUserInput {
  @IsString()
  socketId: string;

  @IsNumber()
  @IsOptional()
  turnTimeLimit?: number;

  @IsNumber()
  @IsOptional()
  secretCode?: number;
}
