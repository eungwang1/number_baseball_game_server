import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class BaseballSession extends CoreEntity {
  @Column()
  user1: string;

  @Column()
  user2: string;
}
