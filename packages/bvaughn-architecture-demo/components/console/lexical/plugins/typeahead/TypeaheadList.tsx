import { useLayoutEffect, useMemo, useRef } from "react";
import { FixedSizeList as List } from "react-window";

import TypeaheadListItem, { ItemData } from "./TypeaheadListItem";
import styles from "./TypeaheadList.module.css";

export default function TypeaheadList({
  onItemClick,
  onItemHover,
  results,
  selectedIndex,
}: {
  onItemClick: (index: number) => void;
  onItemHover: (index: number) => void;
  results: string[];
  selectedIndex: number | null;
}) {
  const listRef = useRef<List>(null);
  const lastSelectedIndexRef = useRef(selectedIndex);
  useLayoutEffect(() => {
    if (selectedIndex !== lastSelectedIndexRef.current) {
      lastSelectedIndexRef.current = selectedIndex;

      if (selectedIndex !== null) {
        listRef.current!.scrollToItem(selectedIndex);
      }
    }
  }, [selectedIndex]);

  const itemData = useMemo<ItemData>(
    () => ({
      onItemClick,
      onItemHover,
      results,
      selectedIndex,
    }),
    [onItemClick, onItemHover, results, selectedIndex]
  );

  return (
    <List
      className={styles.TypeaheadList}
      height={200}
      itemCount={results.length}
      itemData={itemData}
      itemSize={25}
      ref={listRef}
      width={200}
    >
      {TypeaheadListItem}
    </List>
  );
}
