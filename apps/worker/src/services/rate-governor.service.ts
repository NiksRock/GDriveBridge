// ============================================================
// Global Rate Governor
// Satisfies: DEFT §11.1 (2.5 writes/sec/account)
// ============================================================

export class RateGovernor {
  private lastExecution = 0;
  private readonly intervalMs = 400; // 2.5 writes/sec = 400ms interval

  async throttle() {
    const now = Date.now();
    const diff = now - this.lastExecution;

    if (diff < this.intervalMs) {
      await new Promise((r) => setTimeout(r, this.intervalMs - diff));
    }

    this.lastExecution = Date.now();
  }
}
