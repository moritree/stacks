import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Markdown from "marked-react";
import { JSX } from "preact/jsx-runtime";
import { message } from "@tauri-apps/plugin-dialog";

interface EntityProps {
  entity: any;
  onSelect: (pos: { x: number; y: number }) => void;
  isSelected: boolean;
}

export default function EntityComponent(props: EntityProps) {
  const style: Record<string, string> = {};
  let content: JSX.Element | null = null;

  Array.from(Object.entries(props.entity)).forEach(([key, value]) => {
    switch (key) {
      case "pos":
        style["--x"] = `calc(${props.entity.pos.x}px * var(--scene-scale))`;
        style["--y"] = `calc(${props.entity.pos.y}px * var(--scene-scale))`;
        break;
      case "rotation":
        style.rotate = `${props.entity.rotation || 0}deg`;
        break;
      case "size":
        style.width = `calc(${props.entity.size.width}px * var(--scene-scale))`;
        style.height = `calc(${props.entity.size.height}px * var(--scene-scale))`;
        break;
      case "color":
        style.backgroundColor = `${props.entity.color}`;
        break;
      case "type":
        if (value == "text") {
          style.fontSize = `calc(${(props.entity.fontSize || 1) * 1.5}em * var(--scene-scale))`;
          style.fontFamily = "var(--font-serif)";
          content = <Markdown>{props.entity.content}</Markdown>;
          break;
        } else if (value == "text_input") {
          style.fontSize = `calc(${(props.entity.fontSize || 1) * 1.5}em * var(--scene-scale))`;
          style.fontFamily = "var(--font-sans)";

          content = (
            <input
              class="w-full h-full pl-1 pr-1 read-only:text-text-color/50"
              value={props.entity.content}
              placeholder={props.entity.placeholder}
              autocomplete="off"
              autoCorrect="off"
              readonly={props.entity.disabled}
              onInput={(e) => {
                props.entity.content = e.currentTarget.value;
                invoke("update_entity", {
                  id: props.entity.id,
                  data: { content: e.currentTarget.value },
                });
                if (props.entity.scripts.on_change) {
                  runScript("on_change", {
                    text: props.entity.content,
                  });
                }
              }}
              onKeyUp={(e) => {
                if (e.key === "Enter" && props.entity.scripts.on_submit) {
                  e.currentTarget.blur();
                  runScript("on_submit", {
                    text: props.entity.content,
                  });
                }
              }}
            />
          );
        } else if (value == "svg") {
          content = (
            <svg
              width={`calc(${props.entity.size.width}px * var(--scene-scale))`}
              height={`calc(${props.entity.size.height}px * var(--scene-scale))`}
              viewBox={"0 0 100 100"}
              dangerouslySetInnerHTML={{ __html: props.entity.content }}
            />
          );
        }
    }
  });

  async function runScript(script: string, params: any) {
    const [success, msg] = await invoke<[boolean, string]>("run_script", {
      id: props.entity.id,
      function: script,
      params: params,
    });
    if (!success)
      message(msg, {
        title: `Error executing script "${script}" on entity "${props.entity.id}"`,
        kind: "error",
      });
  }

  async function openInspector() {
    emitTo(getCurrentWindow().label, "select_entity", { id: undefined });

    // If window already exists, focus & update instead of creating a new one
    const existing = await WebviewWindow.getByLabel("inspector");
    if (existing) {
      emitTo("inspector", "provide_entity", props.entity);
      existing.setFocus();
      return;
    }

    // Create new inspector window
    const inspectorWindow = new WebviewWindow("inspector", {
      title: "Inspector",
      url: "src/inspector/inspector.html",
      width: 300,
      height: 600,
      resizable: true,
      minWidth: 200,
      minHeight: 300,
      focus: false,
    });

    inspectorWindow.once("mounted", () => {
      emitTo("inspector", "provide_entity", props.entity);
    });

    inspectorWindow.once("tauri://error", (e) => {
      console.error("Inspector webview had ERROR!", e);
    });
  }

  return (
    <div
      class={`absolute left-(--x) top-(--y) entity ${props.entity.type}
          ${props.entity.selectable ? " selectable" : ""}
          ${props.isSelected ? " selected" : ""}`}
      id={props.entity.id}
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (props.entity.selectable) props.onSelect(props.entity.pos);
      }}
      onDblClick={async (e) => {
        e.stopPropagation();
        emitTo(getCurrentWindow().label, "select_entity", { id: undefined });
        if (props.entity.scripts.on_click) runScript("on_click", {});
      }}
      onContextMenu={async (e) => {
        e.preventDefault();
        (
          await Menu.new({
            items: [
              {
                id: "delete_entity",
                text: "Delete Entity",
                action: async (_: string) =>
                  invoke("delete_entity", { id: props.entity.id }),
              },
              {
                id: "duplicate_entity",
                text: "Duplicate Entity",
                action: async (_: string) =>
                  invoke("duplicate_entity", { id: props.entity.id }),
              },
              {
                id: "inspect",
                text: "Inspect",
                action: async () => openInspector(),
              },
            ],
          })
        ).popup();
      }}
    >
      {content}
    </div>
  );
}
