import { Controller, Get, Post } from '@nestjs/common';
import { SecretCodeService } from './secret_code.service';

@Controller('secret_code')
export class SecretCodeController {
  constructor(private readonly secretCodeService: SecretCodeService) {}

  @Post('/fill')
  async fillUniqueSecretCodes() {
    return await this.secretCodeService.fillUniqueSecretCodes();
  }

  @Get('/random')
  async getAndDeleteRandomSecretCode() {
    return await this.secretCodeService.getAndDeleteRandomSecretCode();
  }
}
