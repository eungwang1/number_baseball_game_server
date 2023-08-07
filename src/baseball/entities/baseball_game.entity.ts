import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class BaseballGame {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  user1: string;

  @Column()
  user2: string;

  @Column({ default: false })
  user1Ready: boolean;

  @Column({ default: false })
  user2Ready: boolean;

  @Column({ default: false })
  gameStarted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
