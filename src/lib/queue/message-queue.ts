/**
 * Simple In-Memory Message Queue
 *
 * For MVP, we use a simple in-memory queue with retry logic.
 * This handles the case where webhook processing takes longer than 5s.
 *
 * PRODUCTION UPGRADE PATH:
 * Replace this with BullMQ + Redis when you hit 100+ businesses.
 * The interface stays the same — just swap the implementation.
 *
 * Why not Redis from day 1?
 * - Adds infrastructure cost ($15-30/month)
 * - Adds deployment complexity
 * - Not needed until ~100 concurrent businesses
 * - Vercel serverless handles bursts well enough for MVP
 */

interface QueueJob<T> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processAfter: number;
}

type JobProcessor<T> = (data: T) => Promise<void>;

export class SimpleQueue<T> {
  private queue: QueueJob<T>[] = [];
  private processing = false;
  private processor: JobProcessor<T>;
  private name: string;

  constructor(name: string, processor: JobProcessor<T>) {
    this.name = name;
    this.processor = processor;
  }

  /**
   * Add a job to the queue.
   */
  async add(data: T, options?: { delay?: number; maxAttempts?: number }): Promise<string> {
    const id = `${this.name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const job: QueueJob<T> = {
      id,
      data,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: Date.now(),
      processAfter: Date.now() + (options?.delay || 0),
    };

    this.queue.push(job);
    this.processNext();
    return id;
  }

  /**
   * Process jobs sequentially with retry.
   */
  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const jobIndex = this.queue.findIndex((j) => j.processAfter <= now);

      if (jobIndex === -1) {
        // All jobs are delayed — wait and retry
        const nextJob = this.queue.reduce((min, j) =>
          j.processAfter < min.processAfter ? j : min
        );
        const waitTime = nextJob.processAfter - now;
        await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
        continue;
      }

      const job = this.queue.splice(jobIndex, 1)[0];
      job.attempts++;

      try {
        await this.processor(job.data);
      } catch (error) {
        console.error(`[Queue:${this.name}] Job ${job.id} failed (attempt ${job.attempts}):`, error);

        if (job.attempts < job.maxAttempts) {
          // Exponential backoff: 1s, 4s, 9s
          job.processAfter = Date.now() + job.attempts * job.attempts * 1000;
          this.queue.push(job);
        } else {
          console.error(`[Queue:${this.name}] Job ${job.id} permanently failed after ${job.attempts} attempts`);
          // In production: send to dead letter queue / alert
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue stats.
   */
  getStats() {
    return {
      name: this.name,
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}
