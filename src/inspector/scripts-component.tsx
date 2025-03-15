import { Loader } from "preact-feather";
import { Entity } from "../entity/entity-type";
import AceEditor from "react-ace";
import { JSX } from "preact/jsx-runtime";
const Accordion = lazy(() => import("../components/accordion"));

import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/ext-language_tools";
import { lazy, Suspense } from "preact/compat";

const sections: { label: string; contents: JSX.Element }[] = [
  { label: "Eeeerereeee", contents: <p>ngdsjhkbghjdsikbnghjsd</p> },
  {
    label: "onCode",
    contents: (
      <div class="overflow-auto">
        <AceEditor
          height="300px"
          mode="lua"
          value="definitely certainly possibly maybe"
          theme="github_light_default"
          width="100%"
          setOptions={{
            tabSize: 2,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            showLineNumbers: true,
          }}
        />
      </div>
    ),
  },
  {
    label:
      "Salmonella toolong toolong toolong toolong toolong toolong toolong toolong toolong",
    contents: (
      <div class="w-full h-48 bg-sky-200">
        <Loader />
      </div>
    ),
  },
];

export default function Scripts(props: {
  entity: Entity;
  openScripts: Set<Number>;
  onScriptsChange: (sections: Set<Number>) => void;
}) {
  return (
    <Suspense
      fallback={
        <div class="flex justify-center align-middle">
          <Loader />
        </div>
      }
    >
      <div class="flex flex-col font-mono overflow-y-auto overflow-x-hidden">
        {sections.map((section, index) => (
          <Accordion
            label={section.label}
            open={props.openScripts.has(index)}
            onToggle={(open) => {
              const clone = new Set(props.openScripts);
              if (open) clone.add(index);
              else clone.delete(index);
              props.onScriptsChange(clone);
            }}
          >
            {section.contents}
          </Accordion>
        ))}
      </div>
    </Suspense>
  );
}
