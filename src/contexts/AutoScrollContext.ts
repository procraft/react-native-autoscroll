import React from 'react';
import type {
  AutoScrollBy,
  AutoScrollHandler,
} from '../handlers/AutoScrollHandler';

export interface AutoScrollContextType<T = null> {
  id?: number;
  startScroll: (scrollBy: AutoScrollBy<T>) => void;
  stopScroll: () => void;
  registerScroll: (handler: AutoScrollHandler, parentId?: number) => number;
  removeScroll: (id: number) => void;
}

export const AutoScrollContext = React.createContext<AutoScrollContextType>({
  startScroll: () => {},
  stopScroll: () => {},
  registerScroll: () => -1,
  removeScroll: () => {},
});
