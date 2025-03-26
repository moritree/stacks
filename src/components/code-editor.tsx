import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/ext-language_tools";

export default function CodeEditor(props: {
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
}) {
  return (
    <div class="overflow-auto size-full">
      <AceEditor
        height="100%"
        width="100%"
        mode="lua"
        value={props.value}
        onChange={props.onChange}
        theme={props.theme == "light" ? "github_light_default" : "cloud9_night"}
        setOptions={{
          tabSize: 2,
          enableBasicAutocompletion: true,
          showLineNumbers: true,
        }}
      />
    </div>
  );
}
