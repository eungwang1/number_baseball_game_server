import { IsString } from 'class-validator';

export class DeleteBaseballSessionBySocketIdInput {
  @IsString()
  socketId: string;
}
