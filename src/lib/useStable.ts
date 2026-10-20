import { useCallback, useRef } from 'react';

// A function with one identity for the component's whole life that always runs
// the latest code. Handing it to a memoised child (React.memo) instead of a
// fresh arrow each render lets the child skip re-rendering - the canvas redraws
// every screen and layer on each pan, hover and drag frame otherwise.
export const useStable = <A extends unknown[], R>(fn: (...a: A) => R) => {
  const latest = useRef(fn);
  latest.current = fn;
  return useCallback((...a: A) => latest.current(...a), []);
};
