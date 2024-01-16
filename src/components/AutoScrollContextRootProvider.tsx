import React, { useCallback, useMemo, useRef } from 'react';
import {
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  AutoScrollContext,
  type AutoScrollContextType,
} from '../contexts/AutoScrollContext';
import {
  type AutoScrollBy,
  type AutoScrollHandler,
} from '../handlers/AutoScrollHandler';
import { filterMap, modify } from '../utils';

// * Helpers

function addHandler(
  map: SharedValue<HandlersMap>,
  tree: SharedValue<HandlersTree>,
  id: number,
  handler: AutoScrollHandler,
  parentId?: number
) {
  'worklet';
  modify(
    map,
    (value) => {
      'worklet';
      value[id] = handler;
      return value;
    },
    true
  );
  modify(
    tree,
    (value) => {
      'worklet';
      value.push({ id, prevId: parentId ?? null });
      return value;
    },
    true
  );
}

function removeHandler(
  map: SharedValue<HandlersMap>,
  tree: SharedValue<HandlersTree>,
  id: number
) {
  'worklet';
  modify(
    map,
    (value) => {
      'worklet';
      delete value[id];
      return value;
    },
    true
  );
  modify(
    tree,
    (value) => {
      'worklet';
      const prevId = value.find((item) => item.id === id)?.prevId ?? null;
      for (const handler of value) {
        if (handler.prevId === id) {
          handler.prevId = prevId;
        }
      }
      return value;
    },
    true
  );
}

type HandlersMap = { [key: number]: AutoScrollHandler };
type HandlersTreeItem = { id: number; prevId: number | null };
type HandlersTree = HandlersTreeItem[];

export interface AutoScrollContextRootProviderProps {
  children: React.ReactNode;
}

export function AutoScrollContextRootProvider(
  props: AutoScrollContextRootProviderProps
) {
  const { children } = props;

  const scrollId = useRef(-1);
  const handlers = useSharedValue<HandlersMap>({});
  const handlersTree = useSharedValue<HandlersTree>([]);

  const registerScroll = useCallback<AutoScrollContextType['registerScroll']>(
    (handler, parentId) => {
      const id = ++scrollId.current;
      addHandler(handlers, handlersTree, id, handler, parentId);
      return id;
    },
    [handlers, handlersTree]
  );

  const removeScroll = useCallback<AutoScrollContextType['removeScroll']>(
    (id) => removeHandler(handlers, handlersTree, id),
    [handlers, handlersTree]
  );

  const scrollBy = useSharedValue<AutoScrollBy>(null);

  const collectItems = useCallback(() => {
    'worklet';

    const needScrollTree: HandlersTree = [];
    const needScrollMap: { [key: number]: boolean } = {};

    for (const treeItem of handlersTree.value) {
      const handler = handlers.value[treeItem.id];
      const needScroll = handler?.needScroll(scrollBy.value);
      if (needScroll) {
        needScrollTree.push(treeItem);
        needScrollMap[treeItem.id] = true;
      }
    }

    return { needScrollTree, needScrollMap };
  }, [handlers, handlersTree, scrollBy]);

  const updateScrollBy = useCallback(() => {
    'worklet';
    modify(scrollBy, (v) => {
      'worklet';
      return v;
    });
  }, [scrollBy]);

  useAnimatedReaction<{
    ids: number[];
    idsMap: { [key: number]: boolean };
    scrollBy: AutoScrollBy;
  }>(
    () => {
      const { needScrollTree, needScrollMap } = collectItems();

      for (const { id, prevId } of needScrollTree) {
        if (prevId != null && prevId in needScrollMap) {
          needScrollMap[id] = false;
        }
      }

      return {
        ids: filterMap(needScrollTree, (item) =>
          needScrollMap[item.id] === true ? item.id : null
        ),
        idsMap: needScrollMap,
        scrollBy: scrollBy.value,
      };
    },
    ({ ids, idsMap, scrollBy: scrollByLocal }, prevValue) => {
      console.log('REACTION SET 1');
      const prevIds = prevValue?.ids ?? [];
      for (const id of prevIds) {
        if (idsMap[id] !== true) {
          handlers.value[id]?.stopScroll();
        }
      }
      console.log('REACTION SET 2');
      for (const id of ids) {
        handlers.value[id]?.startScroll(scrollByLocal, updateScrollBy);
      }
      console.log('REACTION SET 3');
    },
    [handlers, scrollBy, collectItems, updateScrollBy]
  );

  const startScroll = useCallback<AutoScrollContextType['startScroll']>(
    (scrollByLocal) => {
      'worklet';
      scrollBy.value = scrollByLocal;
    },
    [scrollBy]
  );

  const stopScroll = useCallback<AutoScrollContextType['stopScroll']>(() => {
    'worklet';
    scrollBy.value = null;
  }, [scrollBy]);

  const value = useMemo<AutoScrollContextType>(
    () => ({
      startScroll,
      stopScroll,
      registerScroll,
      removeScroll,
    }),
    [startScroll, stopScroll, registerScroll, removeScroll]
  );

  return (
    <AutoScrollContext.Provider value={value}>
      {children}
    </AutoScrollContext.Provider>
  );
}
