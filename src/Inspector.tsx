import { Component, render } from "preact";
import "./style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader, MinusCircle, PlusCircle } from "preact-feather";
import { Entity } from "./entity/entity";
import { invoke } from "@tauri-apps/api/core";
import { HexColorPicker } from "react-colorful";

interface InspectorState {
  entity?: Entity;
  colorPickerOpen: Boolean;
}

export default class Inspector extends Component<{}, InspectorState> {
  private entityUpdateListener: () => void = () => {
    return;
  };

  state: InspectorState = {
    colorPickerOpen: false,
  };

  componentDidMount() {
    this.setupEntityUpdateListener();
    emit("mounted");
  }

  componentWillUnmount() {
    this.entityUpdateListener();
  }

  private async setupEntityUpdateListener() {
    const unsubscribe = await listen<any>("update_entity", (e) =>
      this.setState({ entity: e.payload.entity }),
    );
    this.entityUpdateListener = unsubscribe;
  }

  private field(key: string, val: any) {
    let component = (
      <input
        class="max-w-full"
        value={val}
        onInput={(e) =>
          invoke("update_entity_property", {
            id: this.state.entity!.id,
            key: key,
            data: e.currentTarget.value,
          })
        }
      />
    );
    if (key == "pos" || key == "dimension") {
      component = (
        <div class="flex flex-col">
          <label class="pr-2">
            x:{" "}
            <input
              type="number"
              step={10}
              class="max-w-16"
              value={val.x}
              onInput={(e) =>
                invoke("update_entity_property", {
                  id: this.state.entity!.id,
                  key: key,
                  data: { x: e.currentTarget.value, y: val.y },
                })
              }
              maxLength={5}
            />
          </label>
          <label class="pr-2">
            y:{" "}
            <input
              type="number"
              step={10}
              class="max-w-16"
              value={val.y}
              onInput={(e) =>
                invoke("update_entity_property", {
                  id: this.state.entity!.id,
                  key: key,
                  data: { x: val.x, y: e.currentTarget.value },
                })
              }
              maxLength={5}
            />
          </label>
        </div>
      );
    } else if (key == "color") {
      component = (
        <div class="flex flex-col">
          <button
            class="flex flex-row items-center"
            onClick={() =>
              this.setState({ colorPickerOpen: !this.state.colorPickerOpen })
            }
          >
            {this.state.colorPickerOpen ? (
              <MinusCircle class="pr-2" />
            ) : (
              <PlusCircle class="pr-2" />
            )}
            <div class="w-4 h-4" style={{ "background-color": val }} />
            <p class="pl-2">{val}</p>
          </button>
          {this.state.colorPickerOpen && (
            <HexColorPicker
              color={val}
              onChange={(col) =>
                invoke("update_entity_property", {
                  id: this.state.entity!.id,
                  key: key,
                  data: col.toString(),
                })
              }
            />
          )}
        </div>
      );
    }

    if (true)
      return (
        <tr>
          <td>{key}</td>
          <td>{component}</td>
        </tr>
      );
  }

  render() {
    if (!this.state.entity)
      return (
        <div class="w-screen h-screen flex flex-col justify-center">
          <Loader class="w-screen h-10" />
        </div>
      );

    return (
      <div class="w-screen h-screen flex flex-col m-1">
        <span class="inline-flex items-center pb-1">
          <Info class="pr-1" />
          <h1>{this.state.entity.id}</h1>
        </span>
        <table class="table-auto">
          {Object.entries(this.state.entity).map(([key, val]) =>
            this.field(key, val),
          )}
        </table>
      </div>
    );
  }
}

render(<Inspector />, document.getElementById("root")!);
