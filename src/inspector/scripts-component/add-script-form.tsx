import { invoke } from "@tauri-apps/api/core";
import { Minus, Plus } from "preact-feather";
import { useState } from "preact/hooks";

export default function AddScriptForm(props: {
  entityId: string;
  contents: Map<string, string>;
  onContentsChange: (scripts: Map<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newScriptName, setNewScriptName] = useState("");

  return (
    <div
      class={
        "flex flex-row top-1 right-1 justify-end h-auto gap-1 pl-2 z-100" +
        (open && " w-full")
      }
    >
      <div
        class={
          "p-1 h-auto flex gap-1 justify-end transition-transform " +
          (open
            ? "w-full bg-secondary border border-border rounded-md"
            : "w-min")
        }
      >
        {open && (
          <input
            type="text"
            placeholder="Name for new script..."
            spellcheck={false}
            autocomplete="off"
            autoCorrect="off"
            class="grow p-1 h-full bg-base border border-base rounded-sm transition-colors font-sans \
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
                invoke("update_entity", {
                  id: props.entityId,
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
                setOpen(false);
              }
            }}
          />
        )}
        <button
          class={
            "flex flex-row overflow-hidden gap-2 p-1 justify-center bg-tertiary opacity-30 \
              text-base border-border border-1 rounded-md transition-opacity duration-150 \
              hover:opacity-50 active:duration-100 active:opacity-90 active:bg-accent" +
            (!open && " m-[1px]")
          }
          onClick={() => {
            setNewScriptName("");
            setOpen(!open);
          }}
        >
          {open ? <Minus /> : <Plus />}
        </button>
      </div>
    </div>
  );
}
