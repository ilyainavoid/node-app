/**
 * Нагрузочный сценарий с autocannon.
 * По умолчанию бьёт в GET / (не требует БД).
 * Можно менять URL через env LOADTEST_URL.
 */

const autocannon = require('autocannon');
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const TARGET = process.env.LOADTEST_URL || `http://localhost:${PORT}/`;

function run() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(PORT, async () => {
      try {
        console.log(`Load test target: ${TARGET}`);
        const res = await autocannon({
          url: TARGET,
          connections: 20, // число одновременных соединений
          duration: 10,    // секунд
          pipelining: 1,
          percentiles: [50, 75, 90, 95, 99]
        });

        autocannon.printResult(res);

        const { requests, latency, errors } = res;
        const p90 = latency.p90 ?? latency['p90'];
        const p97_5 = latency.p97_5 ?? latency['p97_5'];
        const p95 = typeof latency.percentile === 'function'
          ? Math.round(latency.percentile(95))
          : latency.p95 ?? latency['p95'] ?? latency['95'] ??
            (p90 && p97_5 ? Math.round(p90 + (p97_5 - p90) * (5 / 7.5)) : 'n/a');
        const totalReq = requests.total || 0;
        const errorRate = totalReq ? ((errors / totalReq) * 100).toFixed(2) : 'n/a';

        console.log('Latency stats raw:', latency);
        console.log('Summary:');
        console.log(`  RPS (mean): ${requests.mean}`);
        console.log(`  Latency p95: ${p95} ms`);
        console.log(`  Errors: ${errors} (error rate: ${errorRate}%)`);

        server.close(() => resolve());
      } catch (e) {
        server.close(() => reject(e));
      }
    });
  });
}

run().catch((e) => {
  console.error('Load test failed:', e);
  process.exit(1);
});

