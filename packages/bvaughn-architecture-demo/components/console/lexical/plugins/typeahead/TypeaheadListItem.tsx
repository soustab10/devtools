import styles from "./TypeaheadListItem.module.css";

export default function TypeaheadListItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  result,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  result: string;
}) {
  return (
    <li
      key={result}
      tabIndex={-1}
      className={isSelected ? styles.TypeaheadListItemSelected : styles.TypeaheadListItem}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {result}
    </li>
  );
}
