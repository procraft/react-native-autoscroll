import type { MeasuredDimensions, SharedValue } from 'react-native-reanimated';

export interface Offset {
  x: number;
  y: number;
}

export function modify<T>(
  value: SharedValue<T>,
  modifier: (value: T) => T,
  forceUpdate?: boolean
) {
  'worklet';
  value.modify(modifier, forceUpdate);
}

export function filterMap<T, U>(arr: T[], cb: (item: T) => U | null): U[] {
  'worklet';
  return arr.reduce((prev, curr) => {
    'worklet';
    const v = cb(curr);
    if (v != null) {
      prev.push(v);
    }
    return prev;
  }, [] as U[]);
}

export function easeInExpo(x: number): number {
  'worklet';
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

export function checkCollision(a: MeasuredDimensions, b: MeasuredDimensions) {
  'worklet';
  return (
    a.pageX < b.pageX + b.width &&
    a.pageX + a.width > b.pageX &&
    a.pageY < b.pageY + b.height &&
    a.pageY + a.height < b.pageY
  );
}

export function calcSpeed(offset: number, delta: number) {
  'worklet';
  return minMax(0, 0, easeInExpo((offset + delta) / delta));
}

export function minMax(min: number, max: number, value: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}
