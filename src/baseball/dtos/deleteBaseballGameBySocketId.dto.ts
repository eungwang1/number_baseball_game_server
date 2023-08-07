import { IsString } from 'class-validator';

export class DeleteBaseballGameBySocketIdInput {
  @IsString()
  socketId: string;
}
