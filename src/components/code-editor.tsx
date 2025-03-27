import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/ext-language_tools";

export default function CodeEditor(props: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
}) {
  const editor = (
    <AceEditor
      name={props.name}
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
      commands={[
        {
          name: "commandName",
          bindKey: { win: "Ctrl-c", mac: "Command-c" },
          exec: () => {},
        },
      ]}
      // onCopy={(text) => console.log("COPY", text)}
    />
  );
  return <div class="overflow-auto size-full">{editor}</div>;
}
