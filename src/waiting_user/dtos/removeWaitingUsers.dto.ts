import { IsArray, ValidateNested } from 'class-validator';
import { WaitingUser } from '../entities/waiting_user.entity';
import { Type } from 'class-transformer';

export class RemoveWaitingUsersInput {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaitingUser)
  watingUsers: WaitingUser[];
}
