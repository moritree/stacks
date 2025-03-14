import { Loader } from "preact-feather";
import { Entity } from "../entity/entity-type";
import UnfoldSection from "../unfolding-list/unfold-section";
import { Editor } from "../text-editor/ace-editor";
import { JSX } from "preact/jsx-runtime";

const sections: { label: string; contents: JSX.Element }[] = [
  { label: "Eeeerereeee", contents: <p>ngdsjhkbghjdsikbnghjsd</p> },
  {
    label: "onCode",
    contents: (
      <Editor
        value="definitely certainly possibly maybe"
        mode="Lua"
        height="200px"
      />
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
    <div class="flex flex-col font-mono">
      {sections.map((section, index) => (
        <UnfoldSection
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
        </UnfoldSection>
      ))}
    </div>
  );
}
