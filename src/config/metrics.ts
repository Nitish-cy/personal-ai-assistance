import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [metricsRegistry],
});

export const agentChatRequestsTotal = new Counter({
    name: 'agent_chat_requests_total',
    help: 'Total agent chat requests handled',
    labelNames: ['status'] as const,
    registers: [metricsRegistry],
});

export const agentChatDurationSeconds = new Histogram({
    name: 'agent_chat_duration_seconds',
    help: 'Agent chat request duration in seconds, including LLM and tool calls',
    labelNames: ['status'] as const,
    buckets: [0.5, 1, 2, 5, 10, 20, 30],
    registers: [metricsRegistry],
});
