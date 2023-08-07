import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

export enum LoginType {
  GOOGLE = 'google',
  KAKAO = 'kakao',
}

@Entity()
export class User extends CoreEntity {
  @Column({ type: 'enum', enum: LoginType, default: null })
  loginType: LoginType;
}
