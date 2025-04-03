import AceEditor from "react-ace";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";

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
  return (
    <div class="overflow-auto size-full">
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
            name: "copySelection",
            bindKey: { win: "Ctrl-c", mac: "Command-c" },
            exec: async (editor) => {
              const selectedText = editor.getSelectedText();
              if (selectedText) writeText(selectedText);
            },
          },
          {
            name: "pasteFromClipboard",
            bindKey: { win: "Ctrl-v", mac: "Command-v" },
            exec: async (editor) => {
              try {
                const clipboardText = await readText();
                if (clipboardText) editor.insert(clipboardText);
              } catch (error) {
                console.error("Failed to paste from clipboard:", error);
              }
            },
          },
        ]}
      />
    </div>
  );
}
