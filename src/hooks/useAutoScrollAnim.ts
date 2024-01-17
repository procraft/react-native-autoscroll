import { useCallback } from 'react';
import {
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import type { Offset } from '../utils';

export function useAutoScrollAnim(
  isActive: SharedValue<boolean>,
  scrollOffset: SharedValue<Offset>,
  scrollSpeed: SharedValue<Offset | null>,
  scrollTo: (offset: Offset) => void,
  autoStart: boolean
) {
  const scrollAnim = useFrameCallback(
    ({ timeSincePreviousFrame: deltaTime }) => {
      'worklet';
      if (deltaTime == null || scrollSpeed.value == null) {
        return;
      }

      const deltaX = (scrollSpeed.value.x * deltaTime) / 1000;
      const deltaY = (scrollSpeed.value.y * deltaTime) / 1000;
      const offset: Offset = {
        x: scrollOffset.value.x + deltaX,
        y: scrollOffset.value.y + deltaY,
      };
      scrollTo(offset);
    },
    autoStart
  );

  const setScrollAnimActive = useCallback(
    (isActiveLocal: boolean) => {
      scrollAnim.setActive(isActiveLocal);
    },
    [scrollAnim]
  );

  useDerivedValue(() => {
    runOnJS(setScrollAnimActive)(isActive.value);
  }, [isActive, setScrollAnimActive]);

  return { scrollAnim };
}
