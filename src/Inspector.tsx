import { Component, render } from "preact";
import "./style/main.css";
import { emit, listen } from "@tauri-apps/api/event";

interface InspectorState {
  entity?: any;
  id?: String;
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
    const unsubscribe = await listen<any>("update_entity", (e) => {
      console.log("update_entity received", e.payload);
      this.setState({ entity: e.payload.entity, id: e.payload.id });
    });
    this.entityUpdateListener = unsubscribe;
  }

  render() {
    if (!this.state.entity) return <div class="w-screen h-screen"></div>;

    console.log("Entity", this.state.entity, this.state.id);
    return (
      <div class="w-screen h-screen flex flex-col m-1">
        <h1>{this.state.id}</h1>
      </div>
    );
  }
}

render(<Inspector />, document.getElementById("root")!);
