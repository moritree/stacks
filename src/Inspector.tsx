import { Component, render } from "preact";
import "./style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader } from "preact-feather";
import { Entity } from "./entity/entity";

interface InspectorState {
  entity?: Entity;
}

export default class Inspector extends Component<{}, InspectorState> {
  private entityUpdateListener: () => void = () => {
    return;
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
    let component = val.toString();
    if (key == "pos" || key == "dimension") {
      component = (
        <span class="flex flex-row">
          x: {val.x} y: {val.y}{" "}
        </span>
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
