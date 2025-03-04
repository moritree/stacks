import { Component } from "preact";
import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";
import { Entity } from "./entity";
import { open } from "@tauri-apps/plugin-dialog";

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
          id: "inspect",
          text: "Inspect",
          action: async () => openInspector(entity),
        },
        {
          id: "load_script",
          text: "Load script (DEV)",
          action: async (_: string) => {
            await invoke("load_script", {
              path: await open({
                multiple: false,
                directory: false,
                filters: [
                  {
                    name: "Lua",
                    extensions: ["txt", "lua"],
                  },
                ],
              }),
              id: entity.id,
            });
          },
        },
      ],
    })
  ).popup();
}

async function openInspector(entity: Entity) {
  // If window already exists, focus & update instead of creating a new one
  const existing = await WebviewWindow.getByLabel("inspector");
  if (existing) {
    emitTo("inspector", "update_entity", { entity: entity });
    existing.setFocus();
    return;
  }

  // Create new inspector window
  const inspectorWindow = new WebviewWindow("inspector", {
    title: "Inspector",
    url: "inspector.html",
    width: 300,
    height: 600,
    resizable: true,
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

export default class EntityComponent extends Component<EntityProps> {
  entity: Entity;

  private get style() {
    let style = {
      "--x": `calc(${this.entity.pos.x}px * var(--scene-scale))`,
      "--y": `calc(${this.entity.pos.y}px * var(--scene-scale))`,
    };
    switch (this.entity.type) {
      case "text":
        break;
      case "rect":
        style = {
          ...style,
          ...{
            "--width": `calc(${this.entity.dimension.x}px * var(--scene-scale))`,
            "--height": `calc(${this.entity.dimension.y}px * var(--scene-scale))`,
            "--color": `${this.entity.color}`,
          },
        };
        break;
    }
    return style;
  }

  constructor(props: EntityProps) {
    super(props);
    this.entity = { ...{ id: this.props.id }, ...this.props.entity };
  }

  componentDidUpdate(prevProps: EntityProps) {
    if (this.props.entity !== prevProps.entity) {
      this.entity = { ...{ id: this.props.id }, ...this.props.entity };
    }
  }

  render() {
    return (
      <div
        class={`absolute left-(--x) top-(--y) text-[calc(1.5em*var(--scene-scale))] entity ${this.entity.type}
          ${this.props.entity.selectable ? " selectable" : ""}
          ${this.props.isSelected ? " selected" : ""}
          ${this.props.entity.draggable ? " draggable" : ""}`}
        id={this.entity.id}
        style={this.style}
        onMouseDown={(e) => {
          e.stopPropagation();
          this.props.onSelect(this.entity.pos, !!this.entity.draggable);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (this.entity.on_click) {
            e.preventDefault();
            invoke("run_script", { id: this.entity.id, function: "on_click" });
          }
        }}
        onContextMenu={(e) => {
          handleContextMenu(e, this.entity);
        }}
      >
        {this.entity.type == "text" && this.entity.content}
      </div>
    );
  }
}
