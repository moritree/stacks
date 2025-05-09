import { Loader, MoreHorizontal } from "preact-feather";
import { Entity } from "../../entity/entity-type";
const Accordion = lazy(() => import("../../components/accordion"));
import { lazy, Suspense } from "preact/compat";
import { Menu } from "@tauri-apps/api/menu";
import { confirm } from "@tauri-apps/plugin-dialog";
import CodeEditor from "../../components/code-editor";
import AddScriptForm from "./add-script-form";

export default function Scripts(props: {
  entity: Entity;
  theme: "light" | "dark";
  openScripts: Set<string>;
  onOpenScriptsChange: (sections: Set<string>) => void;
  contents: Map<string, string>;
  onContentsChange: (scripts: Map<string, string>) => void;
  editorHeights: Map<string, number>;
  setEditorHeights: (heights: Map<string, number>) => void;
}) {
  async function handleContextMenu(
    script: string,
    contents: Map<string, string>,
    onContentsChange: (scripts: Map<string, string>) => void,
  ) {
    (
      await Menu.new({
        items: [
          {
            id: "delete_script",
            text: "Delete Script",
            action: async (_: string) => {
              let toUpdate = new Map([...Array.from(contents)]);
              if (!toUpdate.delete(script)) {
                console.error(
                  "Trying to delete script that couldn't be found",
                  script,
                );
                return;
              }

              (await confirm("This action cannot be reverted.\nAre you sure?", {
                title: `Delete ${script} script`,
                kind: "warning",
              })) && onContentsChange(toUpdate);
            },
          },
        ],
      })
    ).popup();
  }

  return (
    <Suspense
      fallback={
        <div class="flex justify-center align-middle">
          <Loader />
        </div>
      }
    >
      <div class="flex flex-col font-mono overflow-y-auto overflow-x-hidden">
        {Array.from(props.contents).map(([key, value], index) => (
          <Accordion
            label={key}
            open={props.openScripts.has(key)}
            onToggle={(open) => {
              const clone = new Set(props.openScripts);
              if (open) clone.add(key);
              else clone.delete(key);
              props.onOpenScriptsChange(clone);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleContextMenu(key, props.contents, props.onContentsChange);
            }}
          >
            <div
              class={`w-full`}
              style={{ height: `${props.editorHeights.get(key) || 128}px` }}
            >
              <CodeEditor
                name={key + "-editor"}
                value={value}
                onChange={(newVal) => {
                  const newContents = new Map(props.contents);
                  newContents.set(key, newVal);
                  props.onContentsChange(newContents);
                }}
                theme={props.theme}
              />
            </div>
            {index < props.contents.size - 1 && (
              <div
                class="h-[6px] border-y-1 border-secondary cursor-ns-resize flex justify-center items-center p-0"
                onMouseDown={(startEvent) => {
                  const startHeight = props.editorHeights.get(key) || 128;
                  const startY = startEvent.clientY;

                  function onMouseMove(moveEvent: MouseEvent) {
                    const delta = moveEvent.clientY - startY;
                    const newHeight = Math.max(50, startHeight + delta);

                    props.setEditorHeights(
                      new Map(props.editorHeights).set(key, newHeight),
                    );
                  }

                  function onMouseUp() {
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                  }

                  document.addEventListener("mousemove", onMouseMove);
                  document.addEventListener("mouseup", onMouseUp);
                }}
              >
                <MoreHorizontal class="h-3 text-border" />
              </div>
            )}
          </Accordion>
        ))}
        <AddScriptForm
          entityId={props.entity.id}
          contents={props.contents}
          onContentsChange={props.onContentsChange}
        />
      </div>
    </Suspense>
  );
}
