import AceEditor from "react-ace";

// Import the modes and themes you want to use
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  mode?: string;
  theme?: string;
  width?: string;
  height?: string;
}

export const Editor = ({
  value,
  onChange,
  mode = "javascript",
  theme = "github",
  width = "100%",
  height = "500px",
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
        useWorker: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
};
