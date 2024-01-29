import React from 'react';
import type {
  AutoScrollBy,
  AutoScrollHandler,
} from '../handlers/AutoScrollHandler';
import {
  type ComponentCoords,
  type MeasuredDimensions,
} from 'react-native-reanimated';

export interface AutoScrollContextType<T = null> {
  id?: number;
  startScroll: (scrollBy: AutoScrollBy<T>) => void;
  stopScroll: () => void;
  registerScroll: (handler: AutoScrollHandler, parentId?: number) => number;
  removeScroll: (id: number) => void;
  scrollTo?: (x: number, y: number) => void;
  measure?: () => MeasuredDimensions | null;
  getRelativeCoords?: (pageX: number, pageY: number) => ComponentCoords | null;
}

export const AutoScrollContext = React.createContext<AutoScrollContextType>({
  startScroll: () => {},
  stopScroll: () => {},
  registerScroll: () => -1,
  removeScroll: () => {},
});
