import { Component } from "preact";
import { Menu } from "@tauri-apps/api/menu";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  id: String;
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
};

async function handleContextMenu(event: Event, id: String) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        {
          id: "delete_entity",
          text: "Delete Entity",
          action: async (_: string) => invoke("delete_entity", { id: id }),
        },
      ],
    })
  ).popup();
}

export default class Entity extends Component<Props> {
  id: String;
  entity: any;
  style: any = {};

  constructor(props: Props) {
    super(props);

    this.id = this.props.id;
    this.entity = this.props.entity;

    console.log(this.entity);

    this.updateStyle();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.entity !== prevProps.entity) {
      this.entity = this.props.entity;
      this.updateStyle();
    }
  }

  updateStyle() {
    this.style = {
      "--x": `${this.entity.pos.x}px`,
      "--y": `${this.entity.pos.y}px`,
    };
    switch (this.entity.type) {
      case "text":
        break;
      case "rect":
        this.style = {
          ...this.style,
          ...{
            "--width": `${this.entity.dimension.x}px`,
            "--height": `${this.entity.dimension.y}px`,
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
        class={`absolute left-(--x) top-(--y) entity ${this.entity.type}
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
          handleContextMenu(e, this.id);
        }}
      >
        {this.props.entity.content && this.entity.content}
      </div>
    );
  }
}
