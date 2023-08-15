import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, OneToMany } from 'typeorm';

export enum LoginType {
  GOOGLE = 'google',
  KAKAO = 'kakao',
}

@Entity()
export class User extends CoreEntity {
  @Column({ type: 'enum', enum: LoginType, default: null })
  loginType: LoginType;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  profileImageUrl: string;

  @Column({ nullable: true })
  lastLoginIp: string;
}
