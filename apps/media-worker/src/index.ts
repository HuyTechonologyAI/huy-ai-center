import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { MediaService } from './service.js';

const PORT = parseInt(process.env.MEDIA_WORKER_PORT || '8090', 10);
const HOST = process.env.MEDIA_WORKER_HOST || '0.0.0.0';

MediaService.initialize();

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  res.setHeader('Content-Type', 'application/json');

  try {
    // 1. Health check
    if (req.method === 'GET' && (pathname === '/health' || pathname === '/v1/media/health')) {
      const hasFfmpeg = MediaService.hasFfmpeg();
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          plane: 'MEDIA_COMPUTE_PLANE',
          status: 'HEALTHY',
          uptime: process.uptime(),
          capabilities: {
            ffmpeg_available: hasFfmpeg,
            vietnamese_tts: 'READY',
            supported_aspect_ratios: ['1:1', '4:5', '16:9', '9:16'],
            storage_dir: MediaService.getStorageDir()
          }
        })
      );
      return;
    }

    // 2. Probe Media
    if (req.method === 'POST' && pathname === '/v1/media/probe') {
      const body = await readJsonBody<{ input_path_or_url: string }>(req);
      if (!body.input_path_or_url) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'input_path_or_url is required' }));
        return;
      }
      const probed = MediaService.probeMedia(body.input_path_or_url);
      res.statusCode = 200;
      res.end(JSON.stringify(probed));
      return;
    }

    // 3. Resize / Transcode Image
    if (req.method === 'POST' && pathname === '/v1/media/resize') {
      const body = await readJsonBody<any>(req);
      if (!body.input_path_or_url || !body.target_aspect_ratio) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'input_path_or_url and target_aspect_ratio are required' }));
        return;
      }
      const result = MediaService.resizeImage(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    // 4. Synthesize Vietnamese Voice
    if (req.method === 'POST' && pathname === '/v1/media/synthesize-voice') {
      const body = await readJsonBody<any>(req);
      if (!body.text) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'text is required' }));
        return;
      }
      const result = MediaService.synthesizeVietnameseVoice(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'ROUTE_NOT_FOUND', path: pathname }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'MEDIA_WORKER_ERROR', message: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[MEDIA-WORKER] Service running on http://${HOST}:${PORT}`);
  console.log(`[MEDIA-WORKER] Storage Cache: ${MediaService.getStorageDir()}`);
});
