import { Component } from "preact";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  id: String;
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
};

export default class Entity extends Component<Props> {
  id: String;
  entity: any;
  style: any = {};

  constructor(props: Props) {
    super(props);

    this.id = this.props.id;
    this.entity = this.props.entity;

    console.log("Construct", this.id, this.entity);

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
        class={`entity ${this.entity.type}
          ${this.props.entity.selectable ? " selectable" : ""}
          ${this.props.isSelected ? " selected" : ""}
          ${this.props.entity.draggable ? " draggable" : ""}`}
        id={this.id.toString()}
        style={this.style}
        onMouseDown={(e) => {
          e.stopPropagation();
          this.props.onSelect(this.entity.pos, this.entity.draggable);
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            invoke("open_context_menu", { id: this.id });
          }
        }}
      >
        {this.props.entity.content && this.entity.content}
      </div>
    );
  }
}
