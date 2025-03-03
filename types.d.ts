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
  }

  const ReactAce: ComponentType<IAceEditorProps>;
  export default ReactAce;
}
