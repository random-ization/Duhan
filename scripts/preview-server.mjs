import { preview } from 'vite';

const requestedPort = Number.parseInt(process.env.PORT || '3000', 10);
const port = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
const server = await preview({ preview: { host: '0.0.0.0', port } });
server.printUrls();
