import { Module } from '@nestjs/common';
import { SecretCode } from './secret_code.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretCodeService } from './secret_code.service';
import { SecretCodeController } from './secret_code.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecretCode])],
  exports: [SecretCodeService],
  providers: [SecretCodeService],
  controllers: [SecretCodeController],
})
export class SecretCodeModule {}
