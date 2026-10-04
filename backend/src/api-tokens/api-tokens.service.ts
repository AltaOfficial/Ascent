import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiTokenEntity } from './entities/api-token.entity';

const TOKEN_PREFIX = 'asc_';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type PublicToken = Pick<
  ApiTokenEntity,
  'id' | 'name' | 'preview' | 'lastUsedAt' | 'revokedAt' | 'createdAt'
>;

function toPublic(token: ApiTokenEntity): PublicToken {
  const { id, name, preview, lastUsedAt, revokedAt, createdAt } = token;
  return { id, name, preview, lastUsedAt, revokedAt, createdAt };
}

@Injectable()
export class ApiTokensService {
  constructor(
    @InjectRepository(ApiTokenEntity)
    private readonly tokenRepository: Repository<ApiTokenEntity>,
  ) {}

  async list(userId: string): Promise<PublicToken[]> {
    const tokens = await this.tokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return tokens.map(toPublic);
  }

  async create(
    userId: string,
    name: string,
  ): Promise<PublicToken & { token: string }> {
    const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const saved = await this.tokenRepository.save(
      this.tokenRepository.create({
        userId,
        name: name.trim().slice(0, 80) || 'MCP token',
        tokenHash: hashToken(token),
        preview: token.slice(0, TOKEN_PREFIX.length + 6),
      }),
    );
    return { ...toPublic(saved), token };
  }

  async revoke(userId: string, id: string): Promise<void> {
    await this.tokenRepository.update(
      { id, userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Returns the owning user id for a valid, unrevoked token. */
  async authenticate(token: string | undefined): Promise<string | null> {
    if (!token?.startsWith(TOKEN_PREFIX)) return null;
    const record = await this.tokenRepository.findOneBy({
      tokenHash: hashToken(token),
      revokedAt: IsNull(),
    });
    if (!record) return null;
    await this.tokenRepository.update(
      { id: record.id },
      { lastUsedAt: new Date() },
    );
    return record.userId;
  }
}
