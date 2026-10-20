import { createContext, useContext } from 'react';
import type { ScreenId } from './screens/registry';

export type Nav = {
  current: ScreenId;
  index: number; // 0-based position in the registry
  go: (id: ScreenId) => void;
};

export const NavContext = createContext<Nav>({ current: 'title', index: 0, go: () => {} });

/** Navigate between screens from anywhere: `const { go } = useNav(); go('projects')` */
export function useNav() {
  return useContext(NavContext);
}
