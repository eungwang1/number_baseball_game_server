import { IsString } from 'class-validator';

export class CreateBaseballGameInput {
  @IsString()
  user1: string;
  @IsString()
  user2: string;
}
