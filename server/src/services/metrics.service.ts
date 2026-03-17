interface RequestMetricInput {
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
}

type CounterKey = string;

const makeKey = (...parts: Array<string | number>): CounterKey => parts.join('::');

class MetricsService {
  private readonly requestCounters = new Map<CounterKey, number>();

  private readonly latencySamples = new Map<string, number[]>();

  private readonly aiCounters = new Map<string, number>();

  private readonly jobCounters = new Map<string, number>();

  recordRequest(input: RequestMetricInput): void {
    const route = input.route || 'unknown';
    const statusClass = `${Math.floor(input.statusCode / 100)}xx`;
    const counterKey = makeKey(input.method, route, statusClass);
    this.requestCounters.set(counterKey, (this.requestCounters.get(counterKey) || 0) + 1);

    const routeSamples = this.latencySamples.get(route) || [];
    routeSamples.push(input.latencyMs);
    if (routeSamples.length > 200) {
      routeSamples.shift();
    }
    this.latencySamples.set(route, routeSamples);
  }

  recordAiEvent(event: 'success' | 'error' | 'timeout' | 'fallback'): void {
    this.aiCounters.set(event, (this.aiCounters.get(event) || 0) + 1);
  }

  recordJobEvent(queue: string, event: 'enqueued' | 'processed' | 'failed'): void {
    const key = makeKey(queue, event);
    this.jobCounters.set(key, (this.jobCounters.get(key) || 0) + 1);
  }

  private getPercentile(samples: number[], percentile: number): number {
    if (samples.length === 0) return 0;
    const ordered = [...samples].sort((left, right) => left - right);
    const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil((percentile / 100) * ordered.length) - 1));
    return ordered[index];
  }

  snapshot() {
    const requests = Array.from(this.requestCounters.entries()).map(([key, count]) => {
      const [method, route, statusClass] = key.split('::');
      const samples = this.latencySamples.get(route) || [];
      return {
        method,
        route,
        statusClass,
        count,
        latencyMs: {
          avg: samples.length > 0 ? Math.round(samples.reduce((sum, sample) => sum + sample, 0) / samples.length) : 0,
          p95: this.getPercentile(samples, 95),
          max: samples.length > 0 ? Math.max(...samples) : 0,
        },
      };
    });

    const ai = Object.fromEntries(this.aiCounters.entries());
    const jobs = Array.from(this.jobCounters.entries()).map(([key, count]) => {
      const [queue, event] = key.split('::');
      return { queue, event, count };
    });

    return {
      generatedAt: new Date().toISOString(),
      requests,
      ai,
      jobs,
    };
  }
}

export const metricsService = new MetricsService();