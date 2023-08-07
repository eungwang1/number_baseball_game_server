import { IsString } from 'class-validator';

export class CreateBaseballSessionInput {
  @IsString()
  user1: string;
  @IsString()
  user2: string;
}
