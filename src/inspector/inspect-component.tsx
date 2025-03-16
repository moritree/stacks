import AceEditor from "react-ace";
import { Entity } from "../entity/entity-type";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/ext-language_tools";

export default function Inspector(props: {
  entity: Entity;
  updateWindowTitle: (saved: boolean) => void;
  editorTheme: string;
  contents: string;
  onContentsChange: (contents: string) => void;
}) {
  const handleChange = (newVal: string) => {
    props.onContentsChange(newVal);
    props.updateWindowTitle(false);
  };

  return (
    <div class="overflow-auto size-full">
      <AceEditor
        height="100%"
        width="100%"
        mode="javascript"
        value={props.contents}
        onChange={handleChange}
        theme={props.editorTheme}
        setOptions={{
          tabSize: 2,
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          showLineNumbers: true,
        }}
      />
    </div>
  );
}
