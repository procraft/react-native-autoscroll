import { type SharedValue } from 'react-native-reanimated';
import type { AutoScrollHandler } from '../handlers/AutoScrollHandler';
import type { Offset } from '../utils';
import { useAutoScrollHandler } from './useAutoScrollHandler';
import { useAutoScrollAnim } from './useAutoScrollAnim';

export function useAutoScroll(
  isActive: SharedValue<boolean>,
  scrollOffset: SharedValue<Offset>,
  scrollSpeed: SharedValue<Offset | null>,
  scrollTo: (offset: Offset) => void,
  startScroll: AutoScrollHandler['startScroll'],
  stopScroll: AutoScrollHandler['stopScroll'],
  needScroll: AutoScrollHandler['needScroll']
) {
  const {
    id,
    registerScrollRoot,
    removeScrollRoot,
    startScrollRoot,
    stopScrollRoot,
  } = useAutoScrollHandler(startScroll, stopScroll, needScroll);

  const { scrollAnim } = useAutoScrollAnim(
    isActive,
    scrollOffset,
    scrollSpeed,
    scrollTo
  );

  return {
    id,
    scrollAnim,
    startScrollRoot,
    stopScrollRoot,
    registerScrollRoot,
    removeScrollRoot,
  };
}
