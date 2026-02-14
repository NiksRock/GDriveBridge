import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    /**
     * TEMP: fake logged-in user
     * Replace with JWT later
     */
    req.user = { id: 'demo-user' };

    return true;
  }
}
