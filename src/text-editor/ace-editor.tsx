import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-cloud9_day";

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  mode?: string;
  theme?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const Editor = ({
  value,
  onChange,
  mode = "javascript",
  theme = "cloud9_day",
  width = "100%",
  height = "100vh",
}: EditorProps) => {
  return (
    <AceEditor
      name="ace-editor"
      mode={mode}
      theme={theme}
      onChange={onChange}
      value={value}
      width={width}
      height={height}
      setOptions={{
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
};
