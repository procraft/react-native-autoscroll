import { useContext, useEffect, useMemo } from 'react';
import { AutoScrollContext } from '../contexts';
import type { AutoScrollHandler } from '../handlers';

export function useAutoScrollHandler(
  startScroll: AutoScrollHandler['startScroll'],
  stopScroll: AutoScrollHandler['stopScroll'],
  needScroll: AutoScrollHandler['needScroll']
) {
  const {
    id: parentId,
    registerScroll: registerScrollRoot,
    removeScroll: removeScrollRoot,
    startScroll: startScrollRoot,
    stopScroll: stopScrollRoot,
  } = useContext(AutoScrollContext);

  const handler = useMemo<AutoScrollHandler>(
    () => ({
      startScroll,
      stopScroll,
      needScroll,
    }),
    [needScroll, startScroll, stopScroll]
  );

  const id = useMemo(
    () => registerScrollRoot(handler, parentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handler, parentId, registerScrollRoot, removeScrollRoot]
  );
  useEffect(
    () => () => {
      removeScrollRoot(id);
    },
    [id, handler, parentId, registerScrollRoot, removeScrollRoot]
  );

  return {
    id,
    registerScrollRoot,
    removeScrollRoot,
    startScrollRoot,
    stopScrollRoot,
  };
}
