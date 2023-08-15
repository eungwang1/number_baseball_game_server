import { IsNumber, IsOptional, IsString } from 'class-validator';

export class FindUserInput {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  email?: string;
}
