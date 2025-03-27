declare module "react-ace" {
  import { ComponentType } from "preact";

  interface IAceEditorProps {
    name?: string;
    mode?: string;
    theme?: string;
    value?: string;
    onChange?: (value: string) => void;
    width?: string;
    height?: string;
    setOptions?: {
      useWorker?: boolean;
      enableBasicAutocompletion?: boolean;
      enableLiveAutocompletion?: boolean;
      enableSnippets?: boolean;
      showLineNumbers?: boolean;
      tabSize?: number;
    };
    commands?: { name: string; bindKey: any; exec: (() => void) | string }[];
    onCopy?: (text: string) => void;
  }

  const ReactAce: ComponentType<IAceEditorProps>;
  export default ReactAce;
}
