import { createCors } from '../dist';

(async () => {
  const { summary, run, bench } = await import('mitata');

  summary(() => {
    bench('base line', () => {
      const _req = new Request('https://example.com');
      const _resp = new Response();
    });

    const cors = createCors();
    bench('createCors', () => {
      const req = new Request('https://example.com');
      const resp = new Response();
      return cors(req, resp);
    });
  });

  return run();
})();
