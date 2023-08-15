import {
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (info && info.name === 'TokenExpiredError') {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Access token has expired',
      });
    }
    if (err || !user) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message: err ? err.message : 'No user',
      });
    }

    return user;
  }
}
