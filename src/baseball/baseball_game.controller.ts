import { Controller, Get, Query } from '@nestjs/common';
import { BaseballGameService } from './baseball_game.service';
import { FindBaseballGameByIdInput } from './dtos/findBaseballGameById.dto';

@Controller('baseball-game')
export class BaseballGameController {
  constructor(private readonly baseballGameService: BaseballGameService) {}

  @Get()
  async findBaseballGameById(@Query() query: FindBaseballGameByIdInput) {
    return await this.baseballGameService.findBaseballGameById({
      id: query.id,
    });
  }
}
