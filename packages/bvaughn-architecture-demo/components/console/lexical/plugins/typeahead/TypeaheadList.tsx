import { MAX_TYPE_AHEAD_SUGGESTIONS } from "./shared";
import TypeaheadListItem from "./TypeaheadListItem";
import styles from "./TypeaheadList.module.css";

export default function TypeaheadList({
  onClick,
  onHover,
  results,
  selectedIndex,
}: {
  onClick: (index: number) => void;
  onHover: (index: number) => void;
  results: Array<string>;
  selectedIndex: number | null;
}) {
  return (
    <ul className={styles.TypeaheadList}>
      {results.slice(0, MAX_TYPE_AHEAD_SUGGESTIONS).map((result, index) => (
        <TypeaheadListItem
          index={index}
          isSelected={index === selectedIndex}
          onClick={() => onClick(index)}
          onMouseEnter={() => onHover(index)}
          key={result}
          result={result}
        />
      ))}
    </ul>
  );
}
