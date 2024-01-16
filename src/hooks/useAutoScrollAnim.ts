import { useCallback } from 'react';
import {
  type SharedValue,
  useFrameCallback,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import type { Offset } from '../utils';

export function useAutoScrollAnim(
  isActive: SharedValue<boolean>,
  scrollOffset: SharedValue<Offset>,
  scrollSpeed: SharedValue<Offset | null>,
  scrollTo: (offset: Offset) => void
) {
  const scrollAnim = useFrameCallback(
    ({ timeSincePreviousFrame: deltaTime }) => {
      'worklet';

      if (deltaTime == null || scrollSpeed.value == null) {
        return;
      }

      const deltaX = (scrollSpeed.value.x * deltaTime) / 1000;
      const deltaY = (scrollSpeed.value.x * deltaTime) / 1000;
      const offset: Offset = {
        x: scrollOffset.value.x + deltaX,
        y: scrollOffset.value.y + deltaY,
      };

      scrollTo(offset);
    },
    false
  );

  const setScrollAnimActive = useCallback(
    (isActiveLocal: boolean) => {
      scrollAnim.setActive(isActiveLocal);
    },
    [scrollAnim]
  );
  const isActiveScrollAnim = scrollAnim.isActive;

  useDerivedValue(() => {
    if (isActive.value !== isActiveScrollAnim) {
      runOnJS(setScrollAnimActive)(isActive.value);
    }
  }, [isActive, isActiveScrollAnim, setScrollAnimActive]);

  return { scrollAnim };
}
