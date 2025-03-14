import { Loader } from "preact-feather";
import { Entity } from "../entity/entity";
import UnfoldSection from "../unfolding-list/unfold-section";
import { Editor } from "../text-editor/ace-editor";

export default function Scripts(props: { entity: Entity }) {
  return (
    <div class="flex flex-col font-mono">
      <UnfoldSection label="Eeeerereeee">ngdsjhkbghjdsikbnghjsd</UnfoldSection>
      <UnfoldSection label="onCode">
        <Editor
          value="definitely certainly possibly maybe"
          mode="Lua"
          height="200px"
        />
      </UnfoldSection>
      <UnfoldSection label="Salmonella toolong toolong toolong toolong toolong toolong toolong toolong toolong">
        <div class="w-full h-48 bg-sky-200">
          <Loader />
        </div>
      </UnfoldSection>
    </div>
  );
}
