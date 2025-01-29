import { invoke } from "@tauri-apps/api/core";
import { Component } from "preact";

type Props = {
  id: String;
  entity: any;
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
    switch (this.entity.type) {
      case "text":
        this.style = {
          "--x": `${this.entity.pos.x}px`,
          "--y": `${this.entity.pos.y}px`,
        };
        break;
      case "rect":
        this.style = {
          "--x": `${this.entity.pos.x}px`,
          "--y": `${this.entity.pos.y}px`,
          "--width": `${this.entity.dimension.x}px`,
          "--height": `${this.entity.dimension.y}px`,
          "--color": `rgb(${this.entity.color.r}, ${this.entity.color.g}, ${this.entity.color.b})`,
        };
        break;
      default:
        console.warn("Invalid entity type", this.id, this.entity.type);
    }
  }

  move_randomly = () => {
    invoke("update_entity_property", {
      id: this.id,
      key: "pos",
      data: { x: 69, y: 420 },
    });
  };

  render() {
    return (
      <div
        class={"entity " + this.entity.type}
        id={this.id.toString()}
        style={this.style}
        draggable={this.entity.draggable}
        onClick={this.move_randomly}
      >
        {this.props.entity.content && this.entity.content}
      </div>
    );
  }
}
