import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyService } from './services/api-key.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        publicKey: configService.get('JWT_PUBLIC_KEY'),
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
    HttpModule,
    ConfigModule,
  ],
  providers: [JwtAuthGuard, ApiKeyGuard, JwtStrategy, ApiKeyService],
  exports: [JwtAuthGuard, ApiKeyGuard, JwtStrategy, ApiKeyService],
})
export class AuthModule {}
