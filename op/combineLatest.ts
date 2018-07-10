import { observable } from "../observable/observable";
import { queue } from "../observable/queue";
import { subscribe } from "../observable/subscribe";

export function combineLatest<T1, T2, T3, T4, T5, T6>(
  s1: AsyncIterable<T1>,
  s2: AsyncIterable<T2>,
  s3: AsyncIterable<T3>,
  s4: AsyncIterable<T4>,
  s5: AsyncIterable<T5>,
  s6: AsyncIterable<T6>
): AsyncIterable<[T1, T2, T3, T4, T5, T6]>;
export function combineLatest<T1, T2, T3, T4, T5>(
  s1: AsyncIterable<T1>,
  s2: AsyncIterable<T2>,
  s3: AsyncIterable<T3>,
  s4: AsyncIterable<T4>,
  s5: AsyncIterable<T5>
): AsyncIterable<[T1, T2, T3, T4, T5]>;
export function combineLatest<T1, T2, T3, T4>(
  s1: AsyncIterable<T1>,
  s2: AsyncIterable<T2>,
  s3: AsyncIterable<T3>,
  s4: AsyncIterable<T4>
): AsyncIterable<[T1, T2, T3, T4]>;
export function combineLatest<T1, T2, T3>(
  s1: AsyncIterable<T1>,
  s2: AsyncIterable<T2>,
  s3: AsyncIterable<T3>
): AsyncIterable<[T1, T2, T3]>;
export function combineLatest<T1, T2>(
  s1: AsyncIterable<T1>,
  s2: AsyncIterable<T2>
): AsyncIterable<[T1, T2]>;
export function combineLatest<T>(
  ...streams: AsyncIterable<T>[]
): AsyncIterable<T[]>;
export function combineLatest<T>(
  ...streams: AsyncIterable<T>[]
): AsyncIterable<T[]> {
  return observable<T[]>(
    queue(observer => {
      let last = new Array<T>(streams.length);
      const subs = streams.map((stream, idx) =>
        subscribe(stream, {
          async next(value: T) {
            const next = [...last];
            next[idx] = value;
            last = next;
            await observer.next(next);
          },
          error: observer.error,
          complete: observer.complete
        })
      );
      return () => {
        for (const sub of subs) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
      };
    })
  );
}
