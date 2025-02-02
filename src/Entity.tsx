import { Component } from "preact";
import { emit, listen } from "@tauri-apps/api/event";
import { Menu } from "@tauri-apps/api/menu";

type Props = {
  id: String;
  entity: any;
  onSelect: (pos: { x: number; y: number }, selectable: boolean) => void;
  isSelected: boolean;
};

const menuPromise = Menu.new({
  items: [
    {
      id: "delete_entity",
      text: "Delete Entity",
      action: async (_: string) => await emit("delete_entity"),
    },
  ],
});

async function contextMenuClickHandler(event: Event, id: String) {
  emit("context_menu_id", id);
  event.preventDefault();
  const menu = await menuPromise;
  menu.popup();
}

export default class Entity extends Component<Props> {
  id: String;
  entity: any;
  style: any = {};
  private unlistenPromise: Promise<() => void> | null = null;

  constructor(props: Props) {
    super(props);

    this.id = this.props.id;
    this.entity = this.props.entity;

    console.log("Construct", this.id, this.entity);

    this.updateStyle();
  }

  componentDidMount(): void {
    // Setup context menu listener
    this.unlistenPromise = listen<string>("menu-event", (event) => {
      if (!event.payload.startsWith("ctx")) return;
      switch (event.payload) {
        default:
          console.log("Unimplemented application menu id:", event.payload);
      }
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.entity !== prevProps.entity) {
      this.entity = this.props.entity;
      this.updateStyle();
    }
  }

  componentWillUnmount(): void {
    if (this.unlistenPromise) {
      this.unlistenPromise.then((unlisten) => unlisten());
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
          contextMenuClickHandler(e, this.id);
        }}
      >
        {this.props.entity.content && this.entity.content}
      </div>
    );
  }
}
