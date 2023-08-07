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
  id: string;

  @Column({ default: null, nullable: true })
  user1: string;

  @Column({ default: null, nullable: true })
  user2: string;

  @Column({ default: null, nullable: true })
  user1_baseball_number: string;

  @Column({ default: null, nullable: true })
  user2_baseball_number: string;

  @Column({ default: null, nullable: true })
  turn: string;

  @Column({ default: false })
  game_started: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
