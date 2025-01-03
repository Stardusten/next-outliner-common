import { withTimeout } from "@/utils/time";

// 任务的元数据，用于描述任务的属性
type TaskMeta = {
  description?: string;
  [key: string]: any;
};

// 任务的 callback 在执行时，会作为参数传入的一些信息
// 用于让 callback 在执行时感知其被执行的上下文
type TaskAwareness = {
  mergedTasks: AsyncTask[];
};

type AsyncTask = {
  id: number;
  // 任务的执行函数
  callback: (awareness: TaskAwareness) => void | Promise<void>;
  // 任务的检查函数，如果返回 false，则任务会被跳过
  // 因为一个任务很可能会被已有任务阻塞，因此有时需要检查任务得到处理机时是否仍然需要执行
  checker?: () => boolean;
  // 任务的类型，用于 debounce 时合并任务
  // 如果任务类型为 "null"，则任务不会被合并
  type: string | "null";
  // 任务的取消函数
  canceller?: () => void;
  // 记录这是否是一个递归任务，防止递归中内部任务阻塞外部任务
  recursive?: boolean;
  // 任务的超时时间，单位为毫秒
  timeout?: number;
  meta?: TaskMeta;
  awareness: TaskAwareness;
};

export type TaskOptions = {
  type?: string;
  delay?: number;
  debounce?: boolean;
  checker?: () => boolean;
  timeout?: number;
  meta?: TaskMeta;
};

export class AsyncTaskQueue {
  private id: number = 0;
  private queue: AsyncTask[] = [];
  private giveupQueue: number[] = [];
  private ongoingTask: AsyncTask | null = null;

  // 任务的默认超时时间，单位为毫秒
  private defaultTimeout: number;

  constructor(defaultTimeout_: number = 2000) {
    this.defaultTimeout = defaultTimeout_;
  }

  addTask(callback: (awareness: TaskAwareness) => void | Promise<void>, options: TaskOptions = {}) {
    const { type, delay, debounce, checker, timeout, meta } = options;
    const id = this.id++;
    // console.log("add task", id);
    // if debounce == true, find a task with the same type in queue to merge
    let mergedTasks: AsyncTask[] = [];
    if (debounce && type != "null") {
      const idx = this.queue.findIndex((item) => item.type == type);
      if (idx !== -1) {
        const task = this.queue[idx];
        task.canceller && task.canceller();
        this.queue.splice(idx, 1);
        mergedTasks.push(...task.awareness.mergedTasks);
        mergedTasks.push(task);
      }
    }
    // detect recursion
    const n = new Error().stack?.split("\n").filter((l) => l.includes("addTask")).length ?? 0;
    const recursive = n > 1;
    const index = this.ongoingTask
      ? this.queue.findIndex((task) => task.id == this.ongoingTask!.id)
      : -1;
    if (delay && delay > 0) {
      const handler = setTimeout(async () => {
        this._processQueue(id);
      }, delay);
      const canceller = () => {
        clearTimeout(handler);
      };
      if (recursive) {
        this.queue.splice(index + 1, 0, {
          id,
          callback,
          type: type ?? "null",
          canceller,
          recursive: true,
          checker,
          timeout,
          meta,
          awareness: { mergedTasks },
        });
      } else {
        this.queue.push({
          id,
          callback,
          type: type ?? "null",
          canceller,
          timeout,
          checker,
          meta,
          awareness: { mergedTasks },
        });
      }
    } else {
      if (recursive) {
        this.queue.splice(index + 1, 0, {
          id,
          callback,
          type: type ?? "null",
          recursive: true,
          checker,
          timeout,
          meta,
          awareness: { mergedTasks },
        });
      } else {
        this.queue.push({
          id,
          callback,
          type: type ?? "null",
          checker,
          timeout,
          meta,
          awareness: { mergedTasks },
        });
      }
      this._processQueue(id);
    }
  }

  async addTaskAndWait(
    callback: (awareness: TaskAwareness) => void | Promise<void>,
    options: {
      type?: string;
      delay?: number;
      debounce?: boolean;
      checker?: () => boolean;
      timeout?: number;
      description?: string;
    } = {},
  ) {
    return new Promise((resolve) => {
      const wrappedTask = async (awareness: TaskAwareness) => {
        await callback(awareness);
        resolve(undefined);
      };

      this.addTask(wrappedTask, options);
    });
  }

  async flushQueue() {
    // add a empty task to flush
    await this.addTaskAndWait(() => {}, {});
  }

  async _processQueue(targetId: number) {
    if (this.queue.length === 0) {
      return;
    }

    if (this.ongoingTask) {
      if (!this.queue[0]!.recursive) {
        this.giveupQueue.push(targetId);
        return;
      }
    }

    const task = this.queue.shift()!;
    const { id, callback, canceller, recursive, checker, timeout, meta, awareness } = task;

    this.ongoingTask = task;

    canceller && canceller();
    if (!checker || checker()) {
      try {
        console.log("callback", awareness);
        const maybePromise = callback(awareness);
        if (maybePromise != null) {
          // is promise
          try {
            await withTimeout(maybePromise as any, timeout ?? this.defaultTimeout); // TODO avoid hardcoding
          } catch (error) {
            console.warn(error);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    this.ongoingTask = null;

    if (id !== targetId) {
      await this._processQueue(targetId);
    }

    // task targetId should be finished here
    if (!recursive && this.giveupQueue.length > 0) {
      queueMicrotask(() => {
        for (const id of this.giveupQueue) {
          const targetId = this.giveupQueue.shift();
          targetId && this._processQueue(id);
        }
      });
    }
  }
}
