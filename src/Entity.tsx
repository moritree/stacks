import { Component } from "preact";
import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";

async function handleContextMenu(event: Event, entity: any, id: string) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        {
          id: "delete_entity",
          text: "Delete Entity",
          action: async (_: string) => invoke("delete_entity", { id: id }),
        },
        {
          id: "inspect",
          text: "Inspect",
          action: async () => openInspector(entity, id),
        },
      ],
    })
  ).popup();
}

async function openInspector(entity: any, id: string) {
  // If window already exists, focus & update instead of creating a new one
  const existing = await WebviewWindow.getByLabel("inspector");
  if (existing) {
    emitTo("inspector", "update_entity", {
      entity: entity,
      id: id,
    });
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
    emitTo("inspector", "update_entity", {
      entity: entity,
      id: id,
    });
  });

  inspectorWindow.once("tauri://error", (e) => {
    console.error("Inspector webview had ERROR!", e);
  });
}

type EntityProps = {
  id: string;
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
};

export default class Entity extends Component<EntityProps> {
  id: string;
  entity: any;
  style: any = {};

  constructor(props: EntityProps) {
    super(props);

    this.id = this.props.id;
    this.entity = this.props.entity;

    this.updateStyle();
  }

  componentDidUpdate(prevProps: EntityProps) {
    if (this.props.entity !== prevProps.entity) {
      this.entity = this.props.entity;
      this.updateStyle();
    }
  }

  updateStyle() {
    this.style = {
      "--x": `calc(${this.entity.pos.x}px * var(--scene-scale))`,
      "--y": `calc(${this.entity.pos.y}px * var(--scene-scale))`,
    };
    switch (this.entity.type) {
      case "text":
        break;
      case "rect":
        this.style = {
          ...this.style,
          ...{
            "--width": `calc(${this.entity.dimension.x}px * var(--scene-scale))`,
            "--height": `calc(${this.entity.dimension.y}px * var(--scene-scale))`,
            "--color": `${this.entity.color}`,
          },
        };
        break;
      default:
        console.warn("Invalid entity type", this.id, this.entity.type);
    }
  }

  render() {
    return (
      <div
        class={`absolute left-(--x) top-(--y) text-[calc(1em*var(--scene-scale))] entity ${this.entity.type}
          ${this.props.entity.selectable ? " selectable" : ""}
          ${this.props.isSelected ? " selected" : ""}
          ${this.props.entity.draggable ? " draggable" : ""}`}
        id={this.id.toString()}
        style={this.style}
        onMouseDown={(e) => {
          e.stopPropagation();
          this.props.onSelect(this.entity.pos, this.entity.draggable);
        }}
        onClick={(e) => {
          if (this.entity.on_click) {
            e.preventDefault();
            invoke("run_script", { id: this.id, function: "on_click" });
          }
        }}
        onContextMenu={(e) => {
          handleContextMenu(e, this.entity, this.id);
        }}
      >
        {this.props.entity.content && this.entity.content}
      </div>
    );
  }
}
