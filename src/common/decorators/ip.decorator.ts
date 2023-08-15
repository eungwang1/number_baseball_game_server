import { createParamDecorator } from '@nestjs/common';

export const ProxyIp = createParamDecorator((data, ctx) => {
  const req = ctx.switchToHttp().getRequest();
  const proxyIp =
    req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  return proxyIp.replace('::ffff:', '');
});
