import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createFrameScheduler } from '../../utils/frameScheduler';

function harness(update: () => void) {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const scheduler = createFrameScheduler(update,
    callback => { frames.set(++id, callback); return id; },
    frame => { frames.delete(frame); });
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  };
  return { scheduler, frames, flush };
}

test('scroll frame scheduler coalesces a burst and reads the latest position', () => {
  let position = 0;
  const seen: number[] = [];
  const h = harness(() => seen.push(position));
  for (position = 1; position <= 30; position++) h.scheduler.schedule();
  assert.equal(h.frames.size, 1);
  assert.deepEqual(seen, []);
  h.flush();
  assert.deepEqual(seen, [31]);
  assert.equal(h.frames.size, 0);
});

test('scroll frame scheduler permits a new frame after flushing', () => {
  let updates = 0;
  const h = harness(() => updates++);
  h.scheduler.schedule(); h.flush();
  h.scheduler.schedule(); h.flush();
  assert.equal(updates, 2);
});

test('scroll frame scheduler cancels unmount work and rejects late events', () => {
  let updates = 0;
  const h = harness(() => updates++);
  h.scheduler.schedule(); h.scheduler.dispose();
  assert.equal(h.frames.size, 0);
  h.scheduler.schedule(); h.flush(); h.scheduler.dispose();
  assert.equal(updates, 0);
});

test('scroll frame scheduler can queue the next frame inside an update', () => {
  let updates = 0;
  const h = harness(() => { if (++updates === 1) h.scheduler.schedule(); });
  h.scheduler.schedule(); h.flush();
  assert.equal(updates, 1);
  assert.equal(h.frames.size, 1);
  h.flush();
  assert.equal(updates, 2);
});

test('scroll frame scheduler recovers its pending flag after an update throws', () => {
  let updates = 0;
  const h = harness(() => { if (++updates === 1) throw new Error('update failed'); });
  h.scheduler.schedule();
  assert.throws(h.flush, /update failed/);
  h.scheduler.schedule(); h.flush();
  assert.equal(updates, 2);
});
