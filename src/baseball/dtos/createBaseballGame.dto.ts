import { IsOptional, IsString } from 'class-validator';

export class CreateBaseballGameInput {
  @IsString()
  @IsOptional()
  user1?: string;
  @IsString()
  @IsOptional()
  user2?: string;
}
