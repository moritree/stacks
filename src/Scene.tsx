import { Component } from "preact";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import EntityComponent from "./entity/entity-component";
import Moveable from "preact-moveable";
import { Menu } from "@tauri-apps/api/menu";
import { save, open } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const SCENE_BASE_SIZE = {
  width: 1280,
  height: 720,
};

async function handleContextMenu(event: Event) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        {
          id: "save_scene",
          text: "Save Scene",
          action: async (_: string) =>
            await invoke("save_scene", {
              path: await save({
                filters: [
                  {
                    name: "scene",
                    extensions: ["txt"],
                  },
                ],
              }),
            }),
        },
        {
          id: "load_scene",
          text: "Load Scene",
          action: async (_: string) =>
            await invoke("load_scene", {
              path: await open({
                multiple: false,
                directory: false,
              }),
            }),
        },
      ],
    })
  ).popup();
}

interface SceneState {
  entities: any;
  selectedId: string | null;
  selectedInitialPosition: {
    x: number;
    y: number;
  };
}

export default class Scene extends Component<{}, SceneState> {
  private listeners: (() => void)[] = [];
  private animationFrameId?: number;

  private get selectedEntity() {
    return this.state.selectedId
      ? this.state.entities[this.state.selectedId]
      : null;
  }

  state: SceneState = {
    entities: {},
    selectedId: null,
    selectedInitialPosition: { x: 0, y: 0 },
  };

  componentDidMount() {
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      invoke("tick", { dt });
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);

    // setup listener and immediately start handling updates
    this.setupUpdateListener();
    this.setupResizeListener();
  }

  componentWillUnmount() {
    this.listeners.forEach((listener) => listener());
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private async setupUpdateListener() {
    const unsubscribe = await listen<any>("scene_update", (e) => {
      this.setState({ entities: e.payload });
    });
    this.listeners.push(unsubscribe);
  }

  private async setupResizeListener() {
    const unsubscribe = await listen<any>("tauri://resize", async (e) => {
      // Do nothing if the window being resized is a different one
      // Yes this is janky and I should write a better solution
      const thisWindowSize = await WebviewWindow.getCurrent().size();
      if (
        thisWindowSize.width != e.payload.width ||
        thisWindowSize.height != e.payload.height
      )
        return;

      const scaleFactor: number = await invoke("window_scale");

      const contentHeight = document.documentElement.clientHeight; // content area dimensions (excluding title bar)
      const windowHeight = e.payload.height; // gives us the full window dimensions
      const titleBarHeight = windowHeight / scaleFactor - contentHeight; // Calculate title bar height dynamically

      const newScale = e.payload.width / SCENE_BASE_SIZE.width;

      invoke("resize_window", {
        width: Math.round(SCENE_BASE_SIZE.width * newScale),
        height: Math.round(
          SCENE_BASE_SIZE.height * newScale + titleBarHeight * scaleFactor,
        ),
      });
      document.documentElement.style.setProperty(
        `--scene-scale`,
        newScale / scaleFactor + "",
      );
    });
    this.listeners.push(unsubscribe);

    const windowSize = await WebviewWindow.getCurrent().size();
    emit("tauri://resize", windowSize);
  }

  private calculateNewPosition(transform: string) {
    // transform will be in the format "translate(Xpx, Ypx)"
    const matches = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (matches) {
      return {
        x: this.state.selectedInitialPosition.x + parseFloat(matches[1]),
        y: this.state.selectedInitialPosition.y + parseFloat(matches[2]),
      };
    }
    console.error("Drag transform format couldn't be parsed", transform);
    return this.selectedEntity?.pos; // fallback
  }

  private handleBackgroundClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      this.setState({ selectedId: null });
    }
  };

  private handleEntitySelect = (
    id: string,
    pos: { x: number; y: number },
    selectable: boolean,
  ) => {
    console.log("handleEntitySelect", id, pos, selectable);
    if (selectable) {
      console.log("Selected", id);
      this.setState({
        selectedId: id,
        selectedInitialPosition: pos,
      });
    } else {
      this.setState({ selectedId: null });
    }
  };

  private handleDrag = ({ transform }: { transform: string }) => {
    // Update position through backend
    invoke("update_entity_property", {
      id: this.state.selectedId,
      key: "pos",
      data: this.calculateNewPosition(transform),
    });
  };

  render() {
    const { entities, selectedId } = this.state;
    const selectedEntity = selectedId ? entities[selectedId] : null;

    return (
      <div
        class="w-screen h-screen z-0"
        onClick={this.handleBackgroundClick}
        onContextMenu={(e) =>
          e.target === e.currentTarget && handleContextMenu(e)
        }
      >
        {Object.entries(entities).map(([id, entity]) => (
          <EntityComponent
            key={id}
            id={id}
            entity={entity}
            onSelect={(pos, selectable) =>
              this.handleEntitySelect(id, pos, selectable)
            }
            isSelected={id === selectedId}
          />
        ))}
        {selectedEntity && (
          <Moveable
            target={`#${selectedId}`}
            draggable={true}
            onDrag={this.handleDrag}
            className="[z-index:0!important]"
          />
        )}
      </div>
    );
  }
}
