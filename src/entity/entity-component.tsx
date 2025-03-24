import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { Entity } from "./entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Markdown from "marked-react";
import { JSX } from "preact/jsx-runtime";

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
    emitTo("inspector", "provide_entity", entity);
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
    emitTo("inspector", "provide_entity", entity);
  });

  inspectorWindow.once("tauri://error", (e) => {
    console.error("Inspector webview had ERROR!", e);
  });
}

interface EntityProps {
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
}

export default function EntityComponent(props: EntityProps) {
  let style = {
    "--x": `calc(${props.entity.pos.x}px * var(--scene-scale))`,
    "--y": `calc(${props.entity.pos.y}px * var(--scene-scale))`,
    rotate: `${props.entity.rotation || 0}deg`,
  };
  let content: JSX.Element | null = null;
  switch (props.entity.type) {
    case "text":
      style = {
        ...style,
        ...{
          fontSize: `calc(${(props.entity.fontSize || 1) * 1.5}em * var(--scene-scale))`,
          fontFamily: "var(--font-serif)",
        },
      };
      content = <Markdown>{props.entity.content}</Markdown>;
      break;
    case "svg":
      style = {
        ...style,
        ...{
          width: `calc(${props.entity.size.width}px * var(--scene-scale))`,
          height: `calc(${props.entity.size.height}px * var(--scene-scale))`,
        },
      };
      content = (
        <svg
          width={`calc(${props.entity.size.width}px * var(--scene-scale))`}
          height={`calc(${props.entity.size.height}px * var(--scene-scale))`}
          viewBox={"0 0 100 100"}
          dangerouslySetInnerHTML={{ __html: props.entity.content }}
        />
      );
      break;
    case "rect":
      style = {
        ...style,
        ...{
          width: `calc(${props.entity.size.width}px * var(--scene-scale))`,
          height: `calc(${props.entity.size.height}px * var(--scene-scale))`,
          backgroundColor: `${props.entity.color}`,
        },
      };
      break;
  }

  return (
    <div
      class={`absolute left-(--x) top-(--y) entity ${props.entity.type}
          ${props.entity.selectable ? " selectable" : ""}
          ${props.isSelected ? " selected" : ""}
          ${props.entity.draggable ? " draggable" : ""}`}
      id={props.entity.id}
      style={style}
      onMouseDown={(e) => {
        e.stopPropagation();
        props.onSelect(props.entity.pos, !!props.entity.selectable);
      }}
      onDblClick={(e) => {
        e.stopPropagation();
        if (props.entity.scripts.on_click) {
          invoke("run_script", { id: props.entity.id, function: "on_click" });
          emitTo(getCurrentWindow().label, "select_entity", { id: undefined });
        }
      }}
      onContextMenu={(e) => {
        handleContextMenu(e, props.entity);
      }}
    >
      {content}
    </div>
  );
}
