import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // McpAuthModule keeps its OAuth session in cookies
  app.use(cookieParser());
  const website = process.env.WEBSITE_URL?.replace(/\/$/, '');
  // Browser-based MCP clients (e.g. MCP Inspector) discover and use the OAuth
  // endpoints from their own origin; those endpoints are public and
  // token-based, so any origin may call them, without cookies.
  const publicPaths = /^\/(\.well-known|register|token|revoke|mcp)(\/|$)/;
  const cors: CorsOptionsDelegate<Request> = (req, callback) => {
    if (req.headers.origin === website || !publicPaths.test(req.path)) {
      return callback(null, { origin: website, credentials: true });
    }
    callback(null, { origin: true, credentials: false });
  };
  app.enableCors(cors);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
