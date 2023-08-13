import { IsString } from 'class-validator';

export class FindWatingUsersInput {
  @IsString()
  matchId: string;
}
