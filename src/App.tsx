import { Component } from "preact";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Entity from "./Entity";
import Moveable from "preact-moveable";

interface State {
  entities: any;
  selectedId: string | null;
  contextMenuId: string | null;
  selectedInitialPosition: {
    x: number;
    y: number;
  };
}

export default class App extends Component<{}, State> {
  private updateListener?: () => void;
  private contextMenuListener?: () => void;
  private deleteListener?: () => void;
  private animationFrameId?: number;

  private get selectedEntity() {
    return this.state.selectedId
      ? this.state.entities[this.state.selectedId]
      : null;
  }

  state: State = {
    entities: {},
    selectedId: null,
    contextMenuId: null,
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
    this.setupContextMenuListener();
  }

  componentWillUnmount() {
    if (this.updateListener) this.updateListener();
    if (this.contextMenuListener) this.contextMenuListener();
    if (this.deleteListener) this.deleteListener();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private async setupUpdateListener() {
    this.updateListener = await listen<any>("scene_update", (e) => {
      this.setState({ entities: e.payload });
    });
  }

  /**
   * Listen for context menu events.
   * Done here, at the scene level, rather than in each entity,
   * so we only need to deal with one listener & one ID check.
   */
  private async setupContextMenuListener() {
    this.updateListener = await listen<any>("context_menu_id", (e) => {
      this.setState({ contextMenuId: e.payload });
    });

    this.deleteListener = await listen<any>("delete_entity", (_) => {
      console.log("Delete entity", this.state.contextMenuId);
    });
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
    if (selectable) {
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
      <div class="background" onClick={this.handleBackgroundClick}>
        {Object.entries(entities).map(([id, entity]) => (
          <Entity
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
          />
        )}
      </div>
    );
  }
}
