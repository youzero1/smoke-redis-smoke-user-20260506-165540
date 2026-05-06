import { NextResponse } from 'next/server';

export async function GET() {
  const sourceUrl = process.env.SOURCE_REDIS_URL || 'redis://localhost:6379';
  const targetUrl = process.env.TARGET_REDIS_URL || 'redis://localhost:6380';

  const result = {
    source: {
      url: sourceUrl.replace(/:[^:@]*@/, ':***@'),
      status: 'unknown' as string,
      latency: null as number | null,
      error: null as string | null,
    },
    target: {
      url: targetUrl.replace(/:[^:@]*@/, ':***@'),
      status: 'unknown' as string,
      latency: null as number | null,
      error: null as string | null,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const Redis = (await import('ioredis')).default;

    const checkRedis = async (url: string) => {
      const client = new Redis(url, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      const start = Date.now();
      try {
        await client.connect();
        await client.ping();
        const latency = Date.now() - start;
        await client.quit();
        return { status: 'connected', latency, error: null };
      } catch (err: unknown) {
        client.disconnect();
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { status: 'error', latency: null, error: message };
      }
    };

    const [sourceResult, targetResult] = await Promise.all([
      checkRedis(sourceUrl),
      checkRedis(targetUrl),
    ]);

    result.source = { ...result.source, ...sourceResult };
    result.target = { ...result.target, ...targetResult };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.source.error = message;
    result.target.error = message;
    result.source.status = 'error';
    result.target.status = 'error';
  }

  return NextResponse.json(result);
}
