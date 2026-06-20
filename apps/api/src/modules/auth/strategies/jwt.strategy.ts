import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { PublicUser } from '../../users/types/public-user.type';
import { getRequiredEnv } from '../../../common/config/required-env';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        const authorization = req.headers.authorization;
        const bearerPrefix = 'Bearer ';

        if (authorization?.startsWith(bearerPrefix)) {
          return authorization.slice(bearerPrefix.length);
        }

        return req.cookies?.access_token || null;
      },
      ignoreExpiration: false,
      secretOrKey: getRequiredEnv(configService, 'JWT_SECRET', { minLength: 32 }),
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    return this.usersService.toPublicUser(user);
  }
}
