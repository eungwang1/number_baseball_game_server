import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class SecretCode extends CoreEntity {
  @Column({ unique: true })
  secretCode: number;
}
