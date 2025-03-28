import { Loader, Minus, Plus } from "preact-feather";
import { Entity } from "../entity/entity-type";
const Accordion = lazy(() => import("../components/accordion"));
import { lazy, Suspense, useState } from "preact/compat";
import { invoke } from "@tauri-apps/api/core";
import { Menu } from "@tauri-apps/api/menu";
import { confirm } from "@tauri-apps/plugin-dialog";
import CodeEditor from "../components/code-editor";

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

export default function Scripts(props: {
  entity: Entity;
  theme: "light" | "dark";
  openScripts: Set<string>;
  onOpenScriptsChange: (sections: Set<string>) => void;
  contents: Map<string, string>;
  onContentsChange: (scripts: Map<string, string>) => void;
  addScriptsOpen: boolean;
  onAddScriptsOpenChange: () => void;
}) {
  const [newScriptName, setNewScriptName] = useState("");
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
              onContextMenu={(e) => {
                e.preventDefault();
                handleContextMenu(key, props.contents, props.onContentsChange);
              }}
            >
              <div class="w-full h-32">
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
            </Accordion>
          ))}
        </div>
        <div
          class={
            "flex flex-row absolute top-1 right-1 justify-end h-auto gap-1 pl-2 z-10" +
            (props.addScriptsOpen && " w-full")
          }
        >
          <div
            class={
              "p-1 flex gap-1 justify-end transition-transform " +
              (props.addScriptsOpen
                ? " h-auto w-full bg-secondary border border-border rounded-md"
                : " h-auto w-min")
            }
          >
            {props.addScriptsOpen && (
              <input
                type="text"
                placeholder="Name for new script..."
                spellcheck={false}
                autocomplete="off"
                autoCorrect="off"
                class="grow p-1 h-full bg-base border border-base rounded-sm transition-colors \
                    data-[invalid=true]:text-red-600/75 data-[invalid=true]:border-red-600/75"
                data-invalid={props.contents.has(newScriptName.trim())}
                value={newScriptName}
                onInput={(e) => setNewScriptName(e.currentTarget.value)}
                onKeyUp={(e) => {
                  const trimmed = newScriptName.trim();
                  if (
                    e.key === "Enter" &&
                    trimmed !== "" &&
                    !props.contents.has(trimmed)
                  ) {
                    // TODO return success
                    invoke("update_entity", {
                      id: props.entity.id,
                      data: {
                        scripts: {
                          ...Object.fromEntries(
                            Array.from(props.contents).map(([key, value]) => [
                              key,
                              { string: value },
                            ]),
                          ),
                          ...{ [trimmed]: { string: " " } },
                        },
                      },
                    });
                    props.onContentsChange(
                      new Map([...Array.from(props.contents), [trimmed, ""]]),
                    );
                    props.onAddScriptsOpenChange();
                  }
                }}
              />
            )}
            <button
              class={
                "flex flex-row overflow-hidden gap-2 p-1 justify-center bg-tertiary opacity-30 \
                  text-base border-border border-1 rounded-md transition-opacity duration-150 \
                  hover:opacity-50 active:duration-100 active:opacity-90 active:bg-accent" +
                (!props.addScriptsOpen && " m-[1px]")
              }
              onClick={() => {
                setNewScriptName("");
                props.onAddScriptsOpenChange();
              }}
            >
              {props.addScriptsOpen ? <Minus /> : <Plus />}
            </button>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
