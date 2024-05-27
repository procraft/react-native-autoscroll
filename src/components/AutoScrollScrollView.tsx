import React, {
  useCallback,
  useEffect,
  useMemo,
  type ComponentProps,
} from 'react';
import Animated, {
  measure,
  scrollTo,
  useAnimatedRef,
  useDerivedValue,
  useScrollViewOffset,
  useSharedValue,
  type AnimatedRef,
  type MeasuredDimensions,
  getRelativeCoords,
} from 'react-native-reanimated';
import {
  AutoScrollContext,
  type AutoScrollContextType,
} from '../contexts/AutoScrollContext';
import {
  getOffset,
  type AutoScrollBy,
  type AutoScrollHandler,
} from '../handlers/AutoScrollHandler';
import { useAutoScroll } from '../hooks/useAutoScroll';
import type { Offset } from '../utils';

export interface ScrollAnimInfo {
  measurement: MeasuredDimensions;
  offset: Offset;
  cb: (endReached: boolean) => void;
}

export function AutoScrollScrollView(
  props: Omit<ComponentProps<Animated.ScrollView>, 'ref'> & {
    innerRef?: ((ref: Animated.ScrollView) => void) | AnimatedRef<Animated.ScrollView>;
    manualActivate?: boolean;
    manualScrollBy?: AutoScrollBy<number>;
  }
) {
  const {
    innerRef: innerRefProps,
    horizontal: horizontalProps,
    manualActivate,
    manualScrollBy,
    ...otherProps
  } = props;

  const horizontalLocal = useSharedValue(
    typeof horizontalProps === 'object'
      ? horizontalProps?.value
      : horizontalProps
  );
  const horizontal =
    horizontalProps != null && typeof horizontalProps === 'object'
      ? horizontalProps
      : horizontalLocal;

  const handlerId = useSharedValue<number>(-1);
  const scrollAnimInfo = useSharedValue<ScrollAnimInfo | null>(null);

  const animatedRef = useAnimatedRef<Animated.ScrollView>();
  const innerRef = typeof innerRefProps === 'function' && 'current' in innerRefProps ? innerRefProps : void 0
  const innerRefFn = typeof innerRefProps === 'function' && !('current' in innerRefProps) ? innerRefProps : void 0
  const scrollRef = innerRef ?? animatedRef;
  const scrollHandler = useScrollViewOffset(scrollRef);
  const scrollSize = useSharedValue(0);
  const scrollContentSize = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const onRef = useCallback((ref: Animated.ScrollView) => {
    innerRefFn?.(ref)
    scrollRef.current = ref
  }, [innerRefFn, scrollRef])

  const needScroll = useCallback<AutoScrollHandler['needScroll']>(
    (scrollBy) => {
      'worklet';
      const measurement = measure(scrollRef);
      const offset = getOffset(
        scrollBy,
        measurement,
        handlerId.value,
        horizontal.value
      );
      return offset != null;
    },
    [handlerId, horizontal, scrollRef]
  );

  const startScroll = useCallback<AutoScrollHandler['startScroll']>(
    (scrollBy, cb) => {
      'worklet';
      scrollAnimInfo.value?.cb(false);

      const measurement = measure(scrollRef);
      const offset = getOffset(
        scrollBy,
        measurement,
        handlerId.value,
        horizontal.value
      );
      if (offset != null && measurement != null) {
        scrollAnimInfo.value = {
          measurement,
          offset,
          cb,
        };
      }
    },
    [scrollAnimInfo, scrollRef, handlerId, horizontal]
  );

  const stopScroll = useCallback<AutoScrollHandler['stopScroll']>(() => {
    'worklet';
    scrollAnimInfo.value?.cb(false);
    scrollAnimInfo.value = null;
  }, [scrollAnimInfo]);

  const scrollToInstantly = useCallback(
    (offset: Offset) => {
      'worklet';
      scrollTo(scrollRef, offset.x, offset.y, false);
    },
    [scrollRef]
  );
  const scrollToAnim = useCallback(
    (x: number, y: number) => {
      'worklet';

      scrollTo(scrollRef, x, y, true);
    },
    [scrollRef]
  );

  const isScrollAnimActive = useDerivedValue(() => {
    return scrollAnimInfo.value != null;
  }, [scrollAnimInfo]);

  const scrollSpeed = useDerivedValue<Offset | null>(() => {
    return scrollAnimInfo.value?.offset ?? null;
  }, [scrollAnimInfo]);

  const scrollOffset = useDerivedValue<Offset>(
    () => ({
      x: horizontal.value ? scrollHandler.value : 0,
      y: horizontal.value ? 0 : scrollHandler.value,
    }),
    [horizontal, scrollHandler]
  );

  useDerivedValue(() => {
    if (scrollAnimInfo.value == null) {
      return;
    }
    const offset = scrollAnimInfo.value.offset;
    const maxScroll = scrollContentSize.value.height - scrollSize.value;
    const xReachedEnd =
      !horizontal ||
      offset.x === 0 ||
      (offset.x < 0 && scrollHandler.value <= 0) ||
      (offset.x > 1 && scrollHandler.value >= maxScroll);
    const yReachedEnd =
      horizontal ||
      offset.y === 0 ||
      (offset.y < 0 && scrollHandler.value <= 0) ||
      (offset.y > 1 && scrollHandler.value >= maxScroll);

    if (xReachedEnd && yReachedEnd) {
      scrollAnimInfo.value.cb(true);
    }
  }, [scrollAnimInfo, scrollHandler, scrollContentSize, scrollSize]);

  const autoStart = manualActivate === true && manualScrollBy != null;
  const {
    id,
    startScrollRoot,
    stopScrollRoot,
    registerScrollRoot,
    removeScrollRoot,
  } = useAutoScroll(
    isScrollAnimActive,
    scrollOffset,
    scrollSpeed,
    scrollToInstantly,
    startScroll,
    stopScroll,
    needScroll,
    autoStart,
    manualActivate
  );

  useDerivedValue(() => {
    'worklet';
    if (manualActivate) {
      if (manualScrollBy == null) {
        stopScroll();
      } else {
        const scrollByLocal: AutoScrollBy =
          typeof manualScrollBy === 'number'
            ? { id, speed: manualScrollBy }
            : manualScrollBy;
        startScroll(scrollByLocal, () => {
          'worklet';
        });
      }
    }
  }, [id, manualActivate, manualScrollBy, startScroll, stopScroll]);

  useEffect(() => {
    handlerId.value = id;
    if (typeof horizontalProps !== 'object') {
      horizontal.value = horizontalProps;
    }
  }, [id, handlerId, horizontal, horizontalProps]);

  const measureLocal = useCallback(() => {
    'worklet';

    return measure(scrollRef);
  }, [scrollRef]);

  const getRelativeCoordsLocal = useCallback(
    (pageX: number, pageY: number) => {
      'worklet';

      // @ts-expect-error scrollRef component
      const coords = getRelativeCoords(scrollRef, pageX, pageY);
      if (coords) {
        return { x: coords.x, y: coords.y + scrollHandler.value };
      }
      return { x: 0, y: 0 };
    },
    [scrollHandler.value, scrollRef]
  );

  const value = useMemo<AutoScrollContextType>(
    () => ({
      id,
      startScroll: startScrollRoot,
      stopScroll: stopScrollRoot,
      registerScroll: registerScrollRoot,
      removeScroll: removeScrollRoot,
      scrollTo: scrollToAnim,
      measure: measureLocal,
      getRelativeCoords: getRelativeCoordsLocal,
    }),
    [
      id,
      startScrollRoot,
      stopScrollRoot,
      registerScrollRoot,
      removeScrollRoot,
      scrollToAnim,
      measureLocal,
      getRelativeCoordsLocal,
    ]
  );

  return (
    <AutoScrollContext.Provider value={value}>
      <Animated.ScrollView
        {...otherProps}
        ref={onRef}
        horizontal={horizontalProps}
        onLayout={({ nativeEvent }) => {
          scrollSize.value = nativeEvent.layout.height;
        }}
        onContentSizeChange={(width, height) => {
          scrollContentSize.value = { width, height };
        }}
      />
    </AutoScrollContext.Provider>
  );
}
