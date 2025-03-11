import { Component, render } from "preact";
import "../style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Loader } from "preact-feather";
import { Entity } from "../entity/entity";
import { Editor } from "../text-editor/ace-editor";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Theme } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";

interface InspectorState {
  entity?: Entity;
  colorPickerOpen: Boolean;
  theme: Theme;
  contents: string;
}

export default class Inspector extends Component<{}, InspectorState> {
  private listeners: (() => void)[] = [];

  state: InspectorState = {
    colorPickerOpen: false,
    theme: "light",
    contents: "",
  };

  componentDidMount() {
    this.setupEntityUpdateListener();
    this.setupThemeChangeListener();
    this.updateTheme();
    emit("mounted");
  }

  componentWillUnmount() {
    this.listeners.forEach((listener) => listener());
  }

  private async setupEntityUpdateListener() {
    const unsubscribe = await listen<any>("update_entity", (e) => {
      this.setState({
        entity: e.payload.entity,
        contents: JSON.stringify(e.payload.entity, null, 2),
      });
      this.updateWindowTitle(true);
    });
    this.listeners.push(unsubscribe);
  }

  private async setupThemeChangeListener() {
    const unsubscribe = await getCurrentWindow().onThemeChanged(
      ({ payload: theme }) => this.updateTheme(theme),
    );
    this.listeners.push(unsubscribe);
  }

  private async updateTheme(theme?: Theme) {
    this.setState({
      theme: theme || (await getCurrentWindow().theme()) || "light",
    });
  }

  private async updateWindowTitle(saved: boolean) {
    getCurrentWindow().setTitle(this.state.entity!.id + (saved ? "" : " *"));
  }

  handleSave = () => {
    try {
      const { id, ...rest } = JSON.parse(this.state.contents);
      invoke("update_entity_properties", { id: id, data: rest });
      this.updateWindowTitle(true);
    } catch (e) {
      console.log("Invalid JSON", e);
    }
  };

  handleChange = (newVal: string) => {
    this.state.contents = newVal;
    this.updateWindowTitle(false);
  };

  render() {
    if (!this.state.entity)
      return (
        <div class="w-screen h-screen flex flex-col justify-center">
          <Loader class="w-screen h-10" />
        </div>
      );

    return (
      <div
        class="w-screen h-screen"
        onKeyUp={(e) => {
          const os = platform();
          if (
            ((os == "macos" && e.metaKey) || (os != "macos" && e.ctrlKey)) &&
            e.code === "KeyS"
          )
            this.handleSave();
        }}
      >
        <Editor
          value={this.state.contents}
          onChange={this.handleChange}
          mode="javascript"
          theme={
            this.state.theme == "light" ? "github_light_default" : "github_dark"
          }
        />
      </div>
    );
  }
}

render(<Inspector />, document.getElementById("root")!);
