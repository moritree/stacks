import { Component, render } from "preact";
import "./style/main.css";
import { emit, listen } from "@tauri-apps/api/event";

interface InspectorState {
  entity?: any;
}

export default class Inspector extends Component<{}, InspectorState> {
  private entityUpdateListener: () => void = () => {
    return;
  };

  state: InspectorState = {
    entity: null,
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
      this.setState({ entity: e.payload });
    });
    this.entityUpdateListener = unsubscribe;
  }

  render() {
    console.log("Render inspector");
    if (this.state.entity)
      return <div class="w-screen h-screen bg-blue-500"></div>;
    return <div class="w-screen h-screen bg-red-500"></div>;
  }
}

render(<Inspector />, document.getElementById("root")!);
