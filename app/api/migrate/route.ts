import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { keyPattern = '*', batchSize = 100, dryRun = true } = body as {
    keyPattern?: string;
    batchSize?: number;
    dryRun?: boolean;
  };

  const sourceUrl = process.env.SOURCE_REDIS_URL || 'redis://localhost:6379';
  const targetUrl = process.env.TARGET_REDIS_URL || 'redis://localhost:6380';

  try {
    const Redis = (await import('ioredis')).default;

    const source = new Redis(sourceUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    const target = new Redis(targetUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    await source.connect();
    if (!dryRun) {
      await target.connect();
    }

    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await source.scan(
        cursor,
        'MATCH',
        keyPattern,
        'COUNT',
        batchSize
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    let migratedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    if (!dryRun) {
      for (const key of keys) {
        try {
          const type = await source.type(key);
          const ttl = await source.pttl(key);

          if (type === 'string') {
            const value = await source.get(key);
            if (value !== null) {
              if (ttl > 0) {
                await target.set(key, value, 'PX', ttl);
              } else {
                await target.set(key, value);
              }
            }
          } else if (type === 'hash') {
            const hash = await source.hgetall(key);
            if (Object.keys(hash).length > 0) {
              await target.hset(key, hash);
              if (ttl > 0) await target.pexpire(key, ttl);
            }
          } else if (type === 'list') {
            const list = await source.lrange(key, 0, -1);
            if (list.length > 0) {
              await target.rpush(key, ...list);
              if (ttl > 0) await target.pexpire(key, ttl);
            }
          } else if (type === 'set') {
            const members = await source.smembers(key);
            if (members.length > 0) {
              await target.sadd(key, ...members);
              if (ttl > 0) await target.pexpire(key, ttl);
            }
          } else if (type === 'zset') {
            const members = await source.zrangebyscore(key, '-inf', '+inf', 'WITHSCORES');
            if (members.length > 0) {
              const args: (string | number)[] = [];
              for (let i = 0; i < members.length; i += 2) {
                args.push(parseFloat(members[i + 1]), members[i]);
              }
              await target.zadd(key, ...(args as Parameters<typeof target.zadd>[1][]));
              if (ttl > 0) await target.pexpire(key, ttl);
            }
          }
          migratedCount++;
        } catch (err: unknown) {
          errorCount++;
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Key "${key}": ${message}`);
        }
      }
    } else {
      migratedCount = keys.length;
    }

    await source.quit();
    if (!dryRun) {
      await target.quit();
    }

    return NextResponse.json({
      success: true,
      dryRun,
      keyPattern,
      totalKeys: keys.length,
      migratedCount,
      errorCount,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
