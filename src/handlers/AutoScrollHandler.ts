import { type MeasuredDimensions } from 'react-native-reanimated';
import { calcSpeedAnim, checkCollision, type Offset } from '../utils';

export type AutoScrollByRect = {
  measurement: MeasuredDimensions;
};
export type AutoScrollById = { id: number; speed: number };
export type AutoScrollBy<T = null> =
  | AutoScrollByRect
  | AutoScrollById
  | T
  | null;

export interface AutoScrollHandler {
  needScroll: (scrollBy: AutoScrollBy) => boolean;
  startScroll: (
    scrollBy: AutoScrollBy,
    callback: (endReached: boolean) => void
  ) => void;
  stopScroll: () => void;
}

export function checkIfAutoScrollById(
  value: AutoScrollBy
): value is AutoScrollById {
  'worklet';
  if (value == null) {
    return false;
  }
  return 'id' in value;
}

export function checkIfAutoScrollByRect(
  value: AutoScrollBy
): value is AutoScrollByRect {
  'worklet';
  if (value == null) {
    return false;
  }
  return 'measurement' in value;
}

export function getOffsetById(
  scrollBy: AutoScrollById,
  handlerId: number,
  horizontal?: boolean | null
): Offset | null {
  'worklet';
  if (handlerId !== scrollBy.id) {
    return null;
  }
  return {
    x: horizontal ? scrollBy.speed : 0,
    y: horizontal ? 0 : scrollBy.speed,
  };
}

export function getOffsetByRect(
  scrollBy: AutoScrollByRect,
  areaMeasurement: MeasuredDimensions | null,
  horizontal?: boolean | null
): Offset | null {
  'worklet';
  const itemMeasurement = scrollBy.measurement;

  if (
    areaMeasurement == null ||
    !checkCollision(areaMeasurement, scrollBy.measurement)
  ) {
    return null;
  }

  const itemTop = horizontal ? itemMeasurement.pageX : itemMeasurement.pageY;
  const areaTop = horizontal ? areaMeasurement.pageX : areaMeasurement.pageY;
  const itemBottom =
    itemTop + (horizontal ? itemMeasurement.width : itemMeasurement.height);
  const areaBottom =
    areaTop + (horizontal ? areaMeasurement.width : areaMeasurement.height);

  const offsetBack = areaTop - itemTop;
  const offsetForward = itemBottom - areaBottom;
  const areaSize = horizontal ? areaMeasurement.width : areaMeasurement.height;

  const backSpeed = calcSpeedAnim(offsetBack, 60) * areaSize;
  const forwardSpeed = calcSpeedAnim(offsetForward, 60) * areaSize;

  if (backSpeed > 0 || forwardSpeed > 0) {
    const xSpeed = backSpeed > forwardSpeed ? -backSpeed : forwardSpeed;
    const ySpeed = backSpeed > forwardSpeed ? -backSpeed : forwardSpeed;
    return {
      x: horizontal ? xSpeed : 0,
      y: horizontal ? 0 : ySpeed,
    };
  }

  return null;
}

export function getOffset(
  scrollBy: AutoScrollBy,
  measurement: MeasuredDimensions | null,
  handlerId: number,
  horizontal?: boolean | null
): Offset | null {
  'worklet';

  if (checkIfAutoScrollById(scrollBy)) {
    return getOffsetById(scrollBy, handlerId, horizontal);
  }
  if (checkIfAutoScrollByRect(scrollBy)) {
    return getOffsetByRect(scrollBy, measurement, horizontal);
  }
  return null;
}
