import { Component, render } from "preact";
import "./style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Loader } from "preact-feather";
import { Entity } from "./entity/entity";
import { Editor } from "./text-editor/ace-editor";
import { invoke } from "@tauri-apps/api/core";

interface InspectorState {
  entity?: Entity;
  colorPickerOpen: Boolean;
  code: string;
}

export default class Inspector extends Component<{}, InspectorState> {
  private entityUpdateListener: () => void = () => {
    return;
  };

  state: InspectorState = {
    colorPickerOpen: false,
    code: "// Write your code here",
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

  handleChange = (newVal: string) => {
    console.log(newVal);
    try {
      const parsedEntity = JSON.parse(newVal);
      this.setState({ entity: parsedEntity });
      const { id, ...rest } = parsedEntity;
      invoke("update_entity_properties", { id: id, data: rest });
    } catch (e) {
      console.log(e);
      console.log("Invalid JSON");
    }
  };

  render() {
    if (!this.state.entity)
      return (
        <div class="w-screen h-screen flex flex-col justify-center">
          <Loader class="w-screen h-10" />
        </div>
      );

    return (
      <Editor
        value={JSON.stringify(this.state.entity!, null, 2)}
        onChange={this.handleChange}
        mode="javascript"
        theme="github_light_default"
      />
    );
  }
}

render(<Inspector />, document.getElementById("root")!);
