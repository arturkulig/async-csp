import { Observable, Observer } from "./observable";
import { Cancellation, Task, resolved, schedule, task } from "../task";

enum BuffedType {
  next,
  complete
}
type Ack = (...args: any[]) => void;
type Buffed<T> = (
  | {
      type: BuffedType.next;
      value: T;
    }
  | {
      type: BuffedType.complete;
    }) & {
  sent: boolean;
  acks?: Ack[];
  cancel?: Cancellation;
};

export function buffer<T>(source: Observable<T>): Observable<T> {
  return function bufferI(observer: Observer<T>) {
    const buff = Array<Buffed<T>>();
    let currentFrame: null | Buffed<T> = null;

    const unsub = source({
      next: function buffer_source_next(value) {
        return buffer_send({ type: BuffedType.next, value, sent: false });
      },
      complete: function buffer_source_complete() {
        return buffer_send({ type: BuffedType.complete, sent: false });
      }
    });

    return function buffer_cancel() {
      unsub();
      if (currentFrame) {
        const { cancel, acks } = currentFrame;
        currentFrame = null;
        if (cancel) {
          cancel();
        }
        if (acks) {
          acks.splice(0).forEach(scheduleAck);
        }
        schedule(buffer_flush);
      }
    };

    function buffer_send(frame: Buffed<T>): Task {
      if (!currentFrame) {
        currentFrame = frame;
        buffer_processCurrentFrame();
        if (frame.sent) {
          return resolved;
        }
      } else {
        buff.push(frame);
      }
      // buffer_flush();

      return task(function buffer_send_ack(resolve) {
        if (frame.sent) {
          resolve();
        } else {
          if (!frame.acks) {
            frame.acks = [];
          }
          frame.acks.push(resolve);
        }
        return function buffer_send_ack_cancel() {
          if (!frame.acks) {
            return;
          }
          const pos = frame.acks.indexOf(resolve);
          if (pos >= 0) {
            frame.acks.splice(pos, 1);
          }
        };
      });
    }

    function buffer_flush() {
      if (buff.length && !currentFrame) {
        const frame = buff.shift()!;
        currentFrame = frame;
        buffer_processCurrentFrame();
      }
    }

    function buffer_processCurrentFrame() {
      if (!currentFrame) {
        return;
      }
      const frame = currentFrame;
      const frameSending =
        frame.type === BuffedType.next
          ? observer.next(frame.value)
          : observer.complete();
      if (frameSending === resolved) {
        buffer_wrapUp();
      } else {
        const cancel = frameSending(buffer_wrapUp);
        frame.cancel = cancel;
      }
    }

    function buffer_wrapUp() {
      if (!currentFrame) {
        return;
      }
      const frame = currentFrame;
      currentFrame = null;
      frame.sent = true;
      if (frame.acks) {
        if (buff.length) {
          if (buff[0].acks && buff[0].acks.length > 0) {
            buff[0].acks = buff[0].acks.concat(frame.acks);
          } else {
            buff[0].acks = frame.acks;
          }
        } else {
          frame.acks.splice(0).forEach(scheduleAck);
        }
      }
      if (buff.length) {
        schedule(buffer_flush);
      }
    }
  };
}

function scheduleAck(ack: Ack) {
  return schedule(ack);
}
