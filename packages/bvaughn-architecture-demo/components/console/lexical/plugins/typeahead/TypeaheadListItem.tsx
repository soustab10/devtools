import { CSSProperties } from "react";

import styles from "./TypeaheadListItem.module.css";

export type ItemData = {
  onItemClick: (index: number) => void;
  onItemHover: (index: number) => void;
  results: String[];
  selectedIndex: number | null;
};

export default function TypeaheadListItem({
  data,
  index,
  style,
}: {
  data: ItemData;
  index: number;
  style: CSSProperties;
}) {
  const { onItemClick, onItemHover, results, selectedIndex } = data;

  const result = results[index];
  const isSelected = index === selectedIndex;

  return (
    <div
      tabIndex={-1}
      className={isSelected ? styles.TypeaheadListItemSelected : styles.TypeaheadListItem}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onClick={() => onItemClick(index)}
      onMouseEnter={() => onItemHover(index)}
      style={style}
    >
      {result}
    </div>
  );
}
