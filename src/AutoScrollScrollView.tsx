import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  measure,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useDerivedValue,
  useFrameCallback,
  useScrollViewOffset,
  useSharedValue,
  type AnimatedRef,
  type MeasuredDimensions,
} from 'react-native-reanimated';

export interface AutoScrollContextType {
  id?: number;
}

export const AutoScrollContext = React.createContext<AutoScrollContextType>({});

export interface AutoScrollHandler {
  needScroll: (measurement: MeasuredDimensions) => boolean;
  startScroll: (
    measurement: MeasuredDimensions,
    callback: (endReached: boolean) => void
  ) => void;
  stopScroll: () => void;
}

export interface AutoScrollRootContextType {
  startScroll: (measurement: MeasuredDimensions) => void;
  stopScroll: () => void;
  registerScroll: (handler: AutoScrollHandler, parentId?: number) => number;
  removeScroll: (id: number) => void;
}

export const AutoScrollRootContext =
  React.createContext<AutoScrollRootContextType>({
    startScroll: () => {},
    stopScroll: () => {},
    registerScroll: () => -1,
    removeScroll: () => {},
  });

interface AutoScrollContextProviderProps {
  children: React.ReactNode;
}

export function AutoScrollContextProvider(
  props: AutoScrollContextProviderProps
) {
  const { children } = props;

  const scrollId = useRef(-1);
  const handlers = useSharedValue<{ [key: number]: AutoScrollHandler }>({});
  const handlersTree = useSharedValue<{ id: number; prevId: number | null }[]>(
    []
  );

  const registerScroll = useCallback<
    AutoScrollRootContextType['registerScroll']
  >(
    (handler, parentId) => {
      const id = ++scrollId.current;

      handlers.modify((value: { [key: number]: AutoScrollHandler }) => {
        'worklet';
        value[id] = handler;
        return value;
      });
      handlersTree.modify((value: { id: number; prevId: number | null }[]) => {
        'worklet';
        value.push({ id, prevId: parentId ?? null });
        return value;
      });

      return id;
    },
    [handlers, handlersTree]
  );

  const removeScroll = useCallback<AutoScrollRootContextType['removeScroll']>(
    (id) => {
      handlers.modify((value: { [key: number]: AutoScrollHandler }) => {
        'worklet';
        delete value[id];
        return value;
      });
      handlersTree.modify((value: { id: number; prevId: number | null }[]) => {
        'worklet';
        const prevId = value.find((item) => item.id === id)?.prevId ?? null;
        const childs = value.filter((item) => item.prevId === id);
        const other = value.filter((item) => item.prevId !== id);
        const modifiedChilds = childs.map((item) => ({ ...item, prevId }));

        return [...other, ...modifiedChilds];
      });
    },
    [handlers, handlersTree]
  );

  const scrollingHandlers = useSharedValue<number[]>([]);

  const startScroll = useCallback<AutoScrollRootContextType['startScroll']>(
    (measurement) => {
      'worklet';
      const needScroll: {
        id: number;
        prevId: number | null;
      }[] = [];
      const needScrollMap: { [key: number]: null } = {};
      for (const treeItem of handlersTree.value) {
        if (handlers.value[treeItem.id]?.needScroll(measurement)) {
          needScroll.push(treeItem);
          needScrollMap[treeItem.id] = null;
        }
      }
      for (const id of scrollingHandlers.value) {
        if (!(id in needScrollMap)) {
          handlers.value[id]?.stopScroll();
        }
      }
      for (const { id, prevId } of needScroll) {
        if (prevId != null && prevId in needScrollMap) {
          handlers.value[id]?.stopScroll();
        }
      }
      scrollingHandlers.value = needScroll
        .filter(({ prevId }) => prevId == null || !(prevId in needScrollMap))
        .map(({ id }) => id);
      for (const idLocal of scrollingHandlers.value) {
        handlers.value[idLocal]?.startScroll(measurement, () => {
          'worklet';
        });
      }
    },
    [scrollingHandlers, handlersTree, handlers]
  );

  const stopScroll = useCallback<
    AutoScrollRootContextType['stopScroll']
  >(() => {
    'worklet';
    for (const idLocal of scrollingHandlers.value) {
      handlers.value[idLocal]?.stopScroll();
    }
    scrollingHandlers.value = [];
  }, [handlers, scrollingHandlers]);

  const value = useMemo<AutoScrollRootContextType>(
    () => ({
      startScroll,
      stopScroll,
      registerScroll,
      removeScroll,
    }),
    [startScroll, stopScroll, registerScroll, removeScroll]
  );

  return (
    <AutoScrollRootContext.Provider value={value}>
      {children}
    </AutoScrollRootContext.Provider>
  );
}

export function useAutoScroll(
  startScroll: AutoScrollHandler['startScroll'],
  stopScroll: AutoScrollHandler['stopScroll'],
  needScroll: AutoScrollHandler['needScroll']
) {
  const { id: parentId } = useContext(AutoScrollContext);
  const contextRoot = useContext(AutoScrollRootContext);

  const handler = useMemo<AutoScrollHandler>(
    () => ({
      startScroll,
      stopScroll,
      needScroll,
    }),
    [needScroll, startScroll, stopScroll]
  );

  const currId = useRef<number>();

  return useMemo(() => {
    if (currId.current != null) {
      contextRoot.removeScroll(currId.current);
    }
    const id = contextRoot.registerScroll(handler, parentId);
    currId.current = id;
    return id;
  }, [contextRoot, handler, parentId]);
}

//! ScrollView

export function AutoScrollScrollView(
  props: Omit<ComponentProps<ScrollView>, 'ref'> & {
    innerRef?: AnimatedRef<Animated.ScrollView>;
  }
) {
  const { innerRef, ...otherProps } = props;

  const animatedRef = useAnimatedRef<Animated.ScrollView>();

  const scrollRef = innerRef ?? animatedRef;
  const scrollHandler = useScrollViewOffset(scrollRef);

  const scrollContentSize = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const scrollSize = useSharedValue(0);

  const getOffset = useCallback(
    (measurement: MeasuredDimensions) => {
      'worklet';

      const currMeasurement = measure(scrollRef);

      if (currMeasurement == null) {
        return { x: 0, y: 0 };
      }

      if (
        currMeasurement.pageX > measurement.pageX + measurement.width ||
        currMeasurement.pageX + currMeasurement.width < measurement.pageX ||
        currMeasurement.pageY > measurement.pageY + measurement.height ||
        currMeasurement.pageY + currMeasurement.height < measurement.pageY
      ) {
        return { x: 0, y: 0 };
      }

      if (currMeasurement.pageY + 60 > measurement.pageY) {
        const delta = Math.min(
          1,
          Math.max(0, (currMeasurement.pageY + 60 - measurement.pageY) / 60)
        );
        const offset = easeInExpo(delta) * scrollSize.value * 2;
        return { x: 0, y: -offset };
      }

      if (
        currMeasurement.pageY + currMeasurement.height <
        measurement.pageY + measurement.height + 60
      ) {
        const delta = Math.min(
          1,
          Math.max(
            0,
            (60 +
              measurement.pageY +
              measurement.height -
              currMeasurement.pageY -
              currMeasurement.height) /
              60
          )
        );
        const offset = easeInExpo(delta) * scrollSize.value * 2;
        return { x: 0, y: offset };
      }
      return { x: 0, y: 0 };
    },
    [scrollRef, scrollSize]
  );

  const needScroll = useCallback<AutoScrollHandler['needScroll']>(
    (measurement) => {
      'worklet';

      const scrollOffset = getOffset(measurement);
      return scrollOffset.x !== 0 || scrollOffset.y !== 0;
    },
    [getOffset]
  );
  const scrollAnimMeta = useSharedValue<{
    measurement: MeasuredDimensions;
    offset: { x: number; y: number };
    cb: (endReached: boolean) => void;
  } | null>(null);

  const scrollAnim = useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';

    if (timeSincePreviousFrame == null || scrollAnimMeta.value == null) {
      return;
    }

    if (scrollAnimMeta.value.offset.y < 0 && scrollHandler.value <= 0) {
      scrollAnimMeta.value.cb(true);
      return;
    }

    if (
      scrollAnimMeta.value.offset.y > 0 &&
      scrollHandler.value >= scrollContentSize.value.height - scrollSize.value
    ) {
      scrollAnimMeta.value.cb(true);
      return;
    }

    const toX =
      scrollHandler.value +
      (scrollAnimMeta.value.offset.x * timeSincePreviousFrame) / 1000;
    const toY =
      scrollHandler.value +
      (scrollAnimMeta.value.offset.y * timeSincePreviousFrame) / 1000;
    scrollTo(scrollRef, toX, toY, false);
  }, false);

  const setScrollAnimActive = useCallback(
    (isActive: boolean) => {
      scrollAnim.setActive(isActive);
    },
    [scrollAnim]
  );
  const isActiveScrollAnim = scrollAnim.isActive;
  const scrollAnimSetActive = scrollAnim.setActive;
  useDerivedValue(() => {
    const isActive = scrollAnimMeta.value != null;
    if (isActive !== isActiveScrollAnim) {
      runOnJS(setScrollAnimActive)(isActive);
    }
  }, [isActiveScrollAnim, scrollAnimSetActive]);

  const startScroll = useCallback<AutoScrollHandler['startScroll']>(
    (measurement, endReached) => {
      'worklet';
      scrollAnimMeta.value?.cb(false);

      const offset = getOffset(measurement);
      scrollAnimMeta.value = {
        measurement,
        offset,
        cb: endReached,
      };
    },
    [scrollAnimMeta, getOffset]
  );

  const stopScroll = useCallback<AutoScrollHandler['stopScroll']>(() => {
    'worklet';
    scrollAnimMeta.value?.cb(false);
    scrollAnimMeta.value = null;
  }, [scrollAnimMeta]);

  const id = useAutoScroll(startScroll, stopScroll, needScroll);

  const value = useMemo(() => ({ id }), [id]);

  return (
    <AutoScrollContext.Provider value={value}>
      <Animated.ScrollView
        {...otherProps}
        ref={scrollRef}
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

//! FlatList

export function AutoScrollFlatList<T>(
  props: Omit<
    FlatListProps<T>,
    | 'ref'
    | 'data'
    | 'renderItem'
    | 'keyExtractor'
    | 'getItemLayout'
    | 'CellRendererComponent'
  > & {
    innerRef?: AnimatedRef<FlatList<T>>;
    data: FlatListProps<T>['data'];
    renderItem: FlatListProps<T>['renderItem'];
    keyExtractor?: FlatListProps<T>['keyExtractor'];
    getItemLayout?: FlatListProps<T>['getItemLayout'];
    CellRendererComponent?: FlatListProps<T>['CellRendererComponent'];
  }
) {
  const { innerRef, ...otherProps } = props;

  const animatedRef = useAnimatedRef<FlatList<T>>();

  const scrollRef = innerRef ?? animatedRef;
  const scrollHandler = useSharedValue(0);

  const scrollContentSize = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const scrollSize = useSharedValue(0);

  const getOffset = useCallback(
    (measurement: MeasuredDimensions) => {
      'worklet';

      const currMeasurement = measure(scrollRef);

      if (currMeasurement == null) {
        return { x: 0, y: 0 };
      }

      if (
        currMeasurement.pageX > measurement.pageX + measurement.width ||
        currMeasurement.pageX + currMeasurement.width < measurement.pageX ||
        currMeasurement.pageY > measurement.pageY + measurement.height ||
        currMeasurement.pageY + currMeasurement.height < measurement.pageY
      ) {
        return { x: 0, y: 0 };
      }

      if (currMeasurement.pageY + 60 > measurement.pageY) {
        const delta = Math.min(
          1,
          Math.max(0, (currMeasurement.pageY + 60 - measurement.pageY) / 60)
        );
        const offset = easeInExpo(delta) * scrollSize.value * 2;
        return { x: 0, y: -offset };
      }

      if (
        currMeasurement.pageY + currMeasurement.height <
        measurement.pageY + measurement.height + 60
      ) {
        const delta = Math.min(
          1,
          Math.max(
            0,
            (60 +
              measurement.pageY +
              measurement.height -
              currMeasurement.pageY -
              currMeasurement.height) /
              60
          )
        );
        const offset = easeInExpo(delta) * scrollSize.value * 2;
        return { x: 0, y: offset };
      }
      return { x: 0, y: 0 };
    },
    [scrollRef, scrollSize]
  );

  const needScroll = useCallback<AutoScrollHandler['needScroll']>(
    (measurement) => {
      'worklet';

      const scrollOffset = getOffset(measurement);
      return scrollOffset.x !== 0 || scrollOffset.y !== 0;
    },
    [getOffset]
  );
  const scrollAnimMeta = useSharedValue<{
    measurement: MeasuredDimensions;
    offset: { x: number; y: number };
    cb: (endReached: boolean) => void;
  } | null>(null);

  const scrollAnim = useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';

    if (timeSincePreviousFrame == null || scrollAnimMeta.value == null) {
      return;
    }

    // if (scrollAnimMeta.value.offset.y < 0 && scrollHandler.value <= 0) {
    //   scrollAnimMeta.value.cb(true);
    //   return;
    // }

    // if (
    //   scrollAnimMeta.value.offset.y > 0 &&
    //   scrollHandler.value >= scrollContentSize.value.height - scrollSize.value
    // ) {
    //   scrollAnimMeta.value.cb(true);
    //   return;
    // }

    const toX =
      scrollHandler.value +
      (scrollAnimMeta.value.offset.x * timeSincePreviousFrame) / 1000;
    const toY =
      scrollHandler.value +
      (scrollAnimMeta.value.offset.y * timeSincePreviousFrame) / 1000;
    scrollTo(scrollRef, toX, toY, false);
  }, false);

  const setScrollAnimActive = useCallback(
    (isActive: boolean) => {
      scrollAnim.setActive(isActive);
    },
    [scrollAnim]
  );
  const isActiveScrollAnim = scrollAnim.isActive;
  const scrollAnimSetActive = scrollAnim.setActive;
  useDerivedValue(() => {
    const isActive = scrollAnimMeta.value != null;
    if (isActive !== isActiveScrollAnim) {
      runOnJS(setScrollAnimActive)(isActive);
    }
  }, [isActiveScrollAnim, scrollAnimSetActive]);

  const startScroll = useCallback<AutoScrollHandler['startScroll']>(
    (measurement, endReached) => {
      'worklet';
      scrollAnimMeta.value?.cb(false);

      const offset = getOffset(measurement);
      scrollAnimMeta.value = {
        measurement,
        offset,
        cb: endReached,
      };
    },
    [scrollAnimMeta, getOffset]
  );

  const stopScroll = useCallback<AutoScrollHandler['stopScroll']>(() => {
    'worklet';
    scrollAnimMeta.value?.cb(false);
    scrollAnimMeta.value = null;
  }, [scrollAnimMeta]);

  const id = useAutoScroll(startScroll, stopScroll, needScroll);

  const value = useMemo(() => ({ id }), [id]);

  return (
    <AutoScrollContext.Provider value={value}>
      <FlatList
        {...otherProps}
        ref={scrollRef}
        onLayout={({ nativeEvent }) => {
          scrollSize.value = nativeEvent.layout.height;
        }}
        onContentSizeChange={(width, height) => {
          scrollContentSize.value = { width, height };
        }}
        onScroll={(evt) => {
          scrollHandler.value = evt.nativeEvent.contentOffset.y;
        }}
      />
    </AutoScrollContext.Provider>
  );
}

function easeInExpo(x: number): number {
  'worklet';
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
