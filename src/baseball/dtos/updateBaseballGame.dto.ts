import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseballNumberHistory } from '../entities/baseball_game.entity';

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

  @IsBoolean()
  @IsOptional()
  game_finished?: boolean;

  @IsBoolean()
  @IsOptional()
  user1_win?: boolean;

  @IsBoolean()
  @IsOptional()
  user2_win?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseballNumberHistory)
  user1_baseball_number_history?: BaseballNumberHistory[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseballNumberHistory)
  user2_baseball_number_history?: BaseballNumberHistory[];
}
