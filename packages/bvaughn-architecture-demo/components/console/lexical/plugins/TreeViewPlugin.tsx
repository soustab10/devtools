import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TreeView } from "@lexical/react/LexicalTreeView";

import styles from "./TreeViewPlugin.module.css";

export default function TreeViewPlugin() {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeView
      viewClassName={styles.TreeView}
      timeTravelPanelClassName="debugTimetravelPanel"
      timeTravelButtonClassName="debugTimetravelButton"
      timeTravelPanelSliderClassName="debugTimetravelPanelSlider"
      timeTravelPanelButtonClassName="debugTimetravelPanelButton"
      editor={editor}
    />
  );
}
