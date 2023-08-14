import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class BaseballNumberHistory {
  baseball_number: string;
  strike: number;
  ball: number;
}

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

  @Column({ default: false })
  game_finished: boolean;

  @Column({ default: false })
  user1_win: boolean;

  @Column({ default: false })
  user2_win: boolean;

  @Column({ type: 'json', default: [] })
  user1_baseball_number_history: BaseballNumberHistory[];

  @Column({ type: 'json', default: [] })
  user2_baseball_number_history: BaseballNumberHistory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
