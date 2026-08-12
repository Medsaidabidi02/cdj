/**
 * mediasoupService.ts
 * Mediasoup SFU service for live streaming.
 *
 * Uses require() instead of import default because mediasoup's ESM interop
 * with ts-node returns undefined for the default export.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediasoupLib = require('mediasoup');

// ─── Internal state ────────────────────────────────────────────────────────

let worker: any;
let router: any;

const transports      = new Map<string, any>();  // transportId → transport
const producers       = new Map<string, any>();  // producerId  → producer
const consumers       = new Map<string, any>();  // consumerId  → consumer
const socketTransports = new Map<string, string[]>(); // socketId → [transportId]
const socketProducers  = new Map<string, string[]>(); // socketId → [producerId]

// ─── Types (exported for server.ts) ────────────────────────────────────────

export interface TransportInfo {
  id: string;
  iceParameters: object;
  iceCandidates: object[];
  dtlsParameters: object;
}

export interface ProducerInfo {
  id: string;
  kind: 'audio' | 'video';
}

export interface ConsumerInfo {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: object;
}

// ─── Codec list ────────────────────────────────────────────────────────────

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    preferredPayloadType: 100,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    preferredPayloadType: 96,
    parameters: {},
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    preferredPayloadType: 97,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    },
  },
];

// ─── Initialisation ────────────────────────────────────────────────────────

export async function initMediasoup(): Promise<void> {
  if (!mediasoupLib || typeof mediasoupLib.createWorker !== 'function') {
    throw new Error('mediasoup module did not load correctly – check npm install');
  }

  worker = await mediasoupLib.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on('died', (error: Error) => {
    console.error('❌ Mediasoup worker died:', error);
    setTimeout(() => process.exit(1), 2000);
  });

  router = await worker.createRouter({ mediaCodecs });
  console.log('✅ Mediasoup Worker + Router initialised');
}

// ─── Router capabilities ───────────────────────────────────────────────────

export function getRouterRtpCapabilities(): object {
  if (!router) throw new Error('Mediasoup not initialised');
  return router.rtpCapabilities;
}

export function isReady(): boolean {
  return !!router;
}

// ─── Transport ─────────────────────────────────────────────────────────────

export async function createWebRtcTransport(socketId: string): Promise<TransportInfo> {
  if (!router) throw new Error('Mediasoup router not ready');

  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000,
  });

  transports.set(transport.id, transport);
  const existing = socketTransports.get(socketId) ?? [];
  existing.push(transport.id);
  socketTransports.set(socketId, existing);

  transport.on('dtlsstatechange', (state: string) => {
    if (state === 'closed') transport.close();
  });

  return {
    id:             transport.id,
    iceParameters:  transport.iceParameters,
    iceCandidates:  transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

// ─── Connect transport ──────────────────────────────────────────────────────

export async function connectTransport(
  transportId: string,
  dtlsParameters: object,
): Promise<void> {
  const transport = transports.get(transportId);
  if (!transport) throw new Error(`Transport ${transportId} not found`);
  await transport.connect({ dtlsParameters });
}

// ─── Produce ───────────────────────────────────────────────────────────────

export async function produce(
  socketId: string,
  transportId: string,
  kind: 'audio' | 'video',
  rtpParameters: object,
): Promise<ProducerInfo> {
  const transport = transports.get(transportId);
  if (!transport) throw new Error(`Transport ${transportId} not found`);

  const producer = await transport.produce({ kind, rtpParameters });

  producers.set(producer.id, producer);
  const existing = socketProducers.get(socketId) ?? [];
  existing.push(producer.id);
  socketProducers.set(socketId, existing);

  producer.on('transportclose', () => producers.delete(producer.id));

  return { id: producer.id, kind };
}

// ─── Consume ───────────────────────────────────────────────────────────────

export async function consume(
  socketId: string,
  transportId: string,
  producerId: string,
  rtpCapabilities: object,
): Promise<ConsumerInfo> {
  if (!router) throw new Error('Mediasoup router not ready');

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error('Cannot consume: incompatible RTP capabilities');
  }

  const transport = transports.get(transportId);
  if (!transport) throw new Error(`Transport ${transportId} not found`);

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: false,
  });

  consumers.set(consumer.id, consumer);
  consumer.on('transportclose', () => consumers.delete(consumer.id));
  consumer.on('producerclose',  () => consumers.delete(consumer.id));

  return {
    id:            consumer.id,
    producerId:    consumer.producerId,
    kind:          consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

// ─── Active producers ──────────────────────────────────────────────────────

export function getActiveProducers(): ProducerInfo[] {
  const result: ProducerInfo[] = [];
  for (const [id, producer] of producers.entries()) {
    if (!producer.closed) {
      result.push({ id, kind: producer.kind });
    }
  }
  return result;
}

// ─── Cleanup on socket disconnect ──────────────────────────────────────────

export function cleanupSocket(socketId: string): void {
  for (const pid of socketProducers.get(socketId) ?? []) {
    const p = producers.get(pid);
    if (p && !p.closed) p.close();
    producers.delete(pid);
  }
  socketProducers.delete(socketId);

  for (const tid of socketTransports.get(socketId) ?? []) {
    const t = transports.get(tid);
    if (t && !t.closed) t.close();
    transports.delete(tid);
  }
  socketTransports.delete(socketId);
}
