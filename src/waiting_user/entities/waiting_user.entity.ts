import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class WaitingUser extends CoreEntity {
  @Column({ unique: true })
  socketId: string;

  @Column({ default: null, nullable: true })
  matchId: string;

  @Column({ default: false })
  isMatchApproved: boolean;
}
