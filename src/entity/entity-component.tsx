import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { Entity } from "./entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";

async function handleContextMenu(event: Event, entity: Entity) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        {
          id: "delete_entity",
          text: "Delete Entity",
          action: async (_: string) =>
            invoke("delete_entity", { id: entity.id }),
        },
        {
          id: "duplicate_entity",
          text: "Duplicate Entity",
          action: async (_: string) =>
            invoke("duplicate_entity", { id: entity.id }),
        },
        {
          id: "inspect",
          text: "Inspect",
          action: async () => openInspector(entity),
        },
      ],
    })
  ).popup();
}

async function openInspector(entity: Entity) {
  emitTo(getCurrentWindow().label, "select_entity", { id: undefined });

  // If window already exists, focus & update instead of creating a new one
  const existing = await WebviewWindow.getByLabel("inspector");
  if (existing) {
    emitTo("inspector", "update_entity", entity);
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
  });

  inspectorWindow.once("mounted", () => {
    emitTo("inspector", "update_entity", { entity: entity });
  });

  inspectorWindow.once("tauri://error", (e) => {
    console.error("Inspector webview had ERROR!", e);
  });
}

interface EntityProps {
  id: string;
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
}

export default function EntityComponent(props: EntityProps) {
  const entity: Entity = { ...{ id: props.id }, ...props.entity };

  let style = {
    "--x": `calc(${entity.pos.x}px * var(--scene-scale))`,
    "--y": `calc(${entity.pos.y}px * var(--scene-scale))`,
  };
  switch (entity.type) {
    case "text":
      break;
    case "rect":
      style = {
        ...style,
        ...{
          "--width": `calc(${entity.size.width}px * var(--scene-scale))`,
          "--height": `calc(${entity.size.height}px * var(--scene-scale))`,
          "--color": `${entity.color}`,
        },
      };
      break;
  }

  return (
    <div
      class={`absolute left-(--x) top-(--y) text-[calc(1.5em*var(--scene-scale))] entity ${entity.type}
          ${props.entity.selectable ? " selectable" : ""}
          ${props.isSelected ? " selected" : ""}
          ${props.entity.draggable ? " draggable" : ""}`}
      id={entity.id}
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation();
        props.onSelect(entity.pos, !!entity.draggable);
      }}
      onDblClick={async (e) => {
        e.stopPropagation();
        if (entity.scripts.on_click) {
          e.preventDefault();
          invoke("run_script", { id: entity.id, function: "on_click" });
          emitTo(getCurrentWindow().label, "select_entity", { id: undefined });
        }
      }}
      onContextMenu={(e) => {
        handleContextMenu(e, entity);
      }}
    >
      {entity.type == "text" && entity.content}
    </div>
  );
}
