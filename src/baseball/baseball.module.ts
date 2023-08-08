import { Module } from '@nestjs/common';
import { BaseballGateway } from './baseball.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingUser } from 'src/waiting_user/entities/waiting_user.entity';
import { User } from 'src/user/entities/user.entity';
import { BaseballGame } from './entities/baseball_game.entity';
import { WaitingUserService } from 'src/waiting_user/waiting_user.service';
import { BaseballGameGateway } from './baseball_game.gateway';
import { BaseballGameService } from './baseball_game.service';

@Module({
  imports: [TypeOrmModule.forFeature([WaitingUser, User, BaseballGame])],
  providers: [
    BaseballGateway,
    WaitingUserService,
    BaseballGameService,
    BaseballGameGateway,
  ],
})
export class BaseballModule {}
