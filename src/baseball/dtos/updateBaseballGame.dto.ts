import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBaseballGameInput {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  user1?: string;

  @IsString()
  @IsOptional()
  user2?: string;

  @IsString()
  @IsOptional()
  user1_baseball_number?: string;

  @IsString()
  @IsOptional()
  user2_baseball_number?: string;

  @IsBoolean()
  @IsOptional()
  game_started?: boolean;

  @IsString()
  @IsOptional()
  turn?: string;
}
