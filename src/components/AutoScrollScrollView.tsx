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
    innerRef?: AnimatedRef<Animated.ScrollView>;
    manualActivate?: boolean;
    manualScrollBy?: AutoScrollBy<number>;
  }
) {
  const {
    innerRef,
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
  const scrollRef = innerRef ?? animatedRef;
  const scrollHandler = useScrollViewOffset(scrollRef);
  const scrollSize = useSharedValue(0);
  const scrollContentSize = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

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

  const scrollToLocal = useCallback(
    (offset: Offset) => {
      'worklet';
      scrollTo(scrollRef, offset.x, offset.y, false);
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
    scrollToLocal,
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

  const value = useMemo<AutoScrollContextType>(
    () => ({
      id,
      startScroll: startScrollRoot,
      stopScroll: stopScrollRoot,
      registerScroll: registerScrollRoot,
      removeScroll: removeScrollRoot,
    }),
    [id, registerScrollRoot, removeScrollRoot, startScrollRoot, stopScrollRoot]
  );

  return (
    <AutoScrollContext.Provider value={value}>
      <Animated.ScrollView
        {...otherProps}
        ref={scrollRef}
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
