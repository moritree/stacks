import { Loader, Plus } from "preact-feather";
import { Entity } from "../entity/entity-type";
import AceEditor from "react-ace";
const Accordion = lazy(() => import("../components/accordion"));

import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/ext-language_tools";
import { lazy, Suspense } from "preact/compat";

export default function Scripts(props: {
  entity: Entity;
  editorTheme: string;
  openScripts: Set<string>;
  onOpenScriptsChange: (sections: Set<string>) => void;
  contents: Map<string, string>;
  onContentsChange: (scripts: Map<string, string>) => void;
}) {
  return (
    <Suspense
      fallback={
        <div class="flex justify-center align-middle">
          <Loader />
        </div>
      }
    >
      <div class="relative h-full">
        <div class="flex flex-col font-mono overflow-y-auto overflow-x-hidden h-full">
          {Array.from(props.contents).map(([key, value]) => (
            <Accordion
              label={key}
              open={props.openScripts.has(key)}
              onToggle={(open) => {
                const clone = new Set(props.openScripts);
                if (open) clone.add(key);
                else clone.delete(key);
                props.onOpenScriptsChange(clone);
              }}
            >
              <div class="overflow-auto w-full h-32">
                <AceEditor
                  height="100%"
                  mode="lua"
                  value={value}
                  onChange={(newVal) => {
                    const newContents = new Map(props.contents);
                    newContents.set(key, newVal);
                    props.onContentsChange(newContents);
                  }}
                  theme={props.editorTheme}
                  width="100%"
                  setOptions={{
                    tabSize: 2,
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    showLineNumbers: true,
                  }}
                />
              </div>
            </Accordion>
          ))}
        </div>
        <div class="flex flex-row absolute top-1 right-1 justify-center align-middle h-auto">
          <button
            class="flex flex-row overflow-hidden gap-2 p-1 justify-center bg-tertiary opacity-30 border-border
            border-1 rounded-md text-base transition-opacity duration-150 hover:opacity-50
            active:duration-100 active:opacity-90 active:bg-accent"
          >
            <Plus />
          </button>
        </div>
      </div>
    </Suspense>
  );
}
