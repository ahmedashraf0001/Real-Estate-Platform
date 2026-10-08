/** Coalesce event bursts into one DOM read/update; dispose cancels pending work. */
export function createFrameScheduler(
  update: () => void,
  request: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
) {
  let pending: number | null = null;
  let disposed = false;
  return {
    schedule() {
      if (disposed || pending !== null) return;
      pending = request(() => {
        pending = null;
        if (!disposed) update();
      });
    },
    dispose() {
      disposed = true;
      if (pending !== null) cancel(pending);
      pending = null;
    },
  };
}
