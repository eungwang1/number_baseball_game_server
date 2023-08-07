import { IsString } from 'class-validator';

export class FindBaseballGameByIdInput {
  @IsString()
  id: string;
}
