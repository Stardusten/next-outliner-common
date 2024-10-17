import { AsyncTaskQueue } from '../taskQueue';
import { describe, test, expect, beforeEach } from 'vitest';

describe('AsyncTaskQueue', () => {
  let queue: AsyncTaskQueue;

  beforeEach(() => {
    queue = new AsyncTaskQueue();
  });

  test('tasks are executed in order', async () => {
    const results: number[] = [];
    
    queue.addTask(() => { results.push(1); });
    queue.addTask(() => { results.push(2); });
    queue.addTask(() => { results.push(3); });

    await queue.flushQueue();

    expect(results).toEqual([1, 2, 3]);
  });

  test('delayed tasks are executed after immediate tasks', async () => {
    const results: string[] = [];
    
    queue.addTask(() => { results.push('Immediate'); });
    queue.addTask(() => { results.push('Delayed'); }, 'delayed', 50);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(results).toEqual(['Immediate', 'Delayed']);
  });

  test('recursive tasks are handled correctly', async () => {
    const results: number[] = [];
    
    queue.addTask(() => {
      results.push(1);
      queue.addTask(() => { results.push(2); });
      queue.addTask(() => { results.push(3); });
    });

    await queue.flushQueue();

    expect(results).toEqual([1, 2, 3]);
  });

  // test('addTaskAndWait returns a promise that resolves when the task is complete', async () => {
  //   const result = await queue.addTaskAndWait(() => 'Done');
  //   expect(result).toBeUndefined();
  // });

  test('tasks with errors do not break the queue', async () => {
    const results: string[] = [];
    
    queue.addTask(() => { results.push('Before Error'); });
    queue.addTask(() => { throw new Error('Test Error'); });
    queue.addTask(() => { results.push('After Error'); });

    await queue.flushQueue();

    expect(results).toEqual(['Before Error', 'After Error']);
  });
});
