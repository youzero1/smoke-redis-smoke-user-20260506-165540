import { NextRequest, NextResponse } from 'next/server';

interface SmokeTestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { target = 'source' } = body as { target?: 'source' | 'target' };

  const url =
    target === 'source'
      ? process.env.SOURCE_REDIS_URL || 'redis://localhost:6379'
      : process.env.TARGET_REDIS_URL || 'redis://localhost:6380';

  const results: SmokeTestResult[] = [];

  try {
    const Redis = (await import('ioredis')).default;
    const client = new Redis(url, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    await client.connect();

    // Test 1: PING
    {
      const start = Date.now();
      try {
        const res = await client.ping();
        results.push({
          name: 'PING',
          status: res === 'PONG' ? 'pass' : 'fail',
          message: `Response: ${res}`,
          duration: Date.now() - start,
        });
      } catch (e: unknown) {
        results.push({
          name: 'PING',
          status: 'fail',
          message: e instanceof Error ? e.message : 'Failed',
          duration: Date.now() - start,
        });
      }
    }

    // Test 2: SET/GET
    {
      const start = Date.now();
      const testKey = `smoke:test:${Date.now()}`;
      const testValue = 'smoke-test-value';
      try {
        await client.set(testKey, testValue, 'EX', 10);
        const val = await client.get(testKey);
        await client.del(testKey);
        results.push({
          name: 'SET/GET',
          status: val === testValue ? 'pass' : 'fail',
          message: val === testValue ? 'Value matches' : `Expected "${testValue}", got "${val}"`,
          duration: Date.now() - start,
        });
      } catch (e: unknown) {
        results.push({
          name: 'SET/GET',
          status: 'fail',
          message: e instanceof Error ? e.message : 'Failed',
          duration: Date.now() - start,
        });
      }
    }

    // Test 3: INCR
    {
      const start = Date.now();
      const counterKey = `smoke:counter:${Date.now()}`;
      try {
        await client.set(counterKey, '0', 'EX', 10);
        const val = await client.incr(counterKey);
        await client.del(counterKey);
        results.push({
          name: 'INCR',
          status: val === 1 ? 'pass' : 'fail',
          message: `Counter value: ${val}`,
          duration: Date.now() - start,
        });
      } catch (e: unknown) {
        results.push({
          name: 'INCR',
          status: 'fail',
          message: e instanceof Error ? e.message : 'Failed',
          duration: Date.now() - start,
        });
      }
    }

    // Test 4: HSET/HGET
    {
      const start = Date.now();
      const hashKey = `smoke:hash:${Date.now()}`;
      try {
        await client.hset(hashKey, { field1: 'value1', field2: 'value2' });
        await client.expire(hashKey, 10);
        const val = await client.hget(hashKey, 'field1');
        await client.del(hashKey);
        results.push({
          name: 'HSET/HGET',
          status: val === 'value1' ? 'pass' : 'fail',
          message: val === 'value1' ? 'Hash field matches' : `Expected "value1", got "${val}"`,
          duration: Date.now() - start,
        });
      } catch (e: unknown) {
        results.push({
          name: 'HSET/HGET',
          status: 'fail',
          message: e instanceof Error ? e.message : 'Failed',
          duration: Date.now() - start,
        });
      }
    }

    // Test 5: TTL
    {
      const start = Date.now();
      const ttlKey = `smoke:ttl:${Date.now()}`;
      try {
        await client.set(ttlKey, 'test', 'EX', 60);
        const ttl = await client.ttl(ttlKey);
        await client.del(ttlKey);
        results.push({
          name: 'TTL',
          status: ttl > 0 && ttl <= 60 ? 'pass' : 'fail',
          message: `TTL: ${ttl}s`,
          duration: Date.now() - start,
        });
      } catch (e: unknown) {
        results.push({
          name: 'TTL',
          status: 'fail',
          message: e instanceof Error ? e.message : 'Failed',
          duration: Date.now() - start,
        });
      }
    }

    await client.quit();

    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;

    return NextResponse.json({
      success: failed === 0,
      target,
      url: url.replace(/:[^:@]*@/, ':***@'),
      results,
      summary: { total: results.length, passed, failed },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        target,
        error: message,
        results,
        summary: { total: results.length, passed: 0, failed: results.length },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
