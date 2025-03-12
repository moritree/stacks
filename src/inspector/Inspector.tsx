import { Component, render } from "preact";
import "../style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Loader } from "preact-feather";
import { Entity } from "../entity/entity";
import { Editor } from "../text-editor/ace-editor";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Theme } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { message } from "@tauri-apps/plugin-dialog";

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
      this.setState(
        {
          entity: e.payload.entity,
          contents: JSON.stringify(e.payload.entity, null, 2),
        },
        () => this.updateWindowTitle(true),
      );
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

  handleSave = async () => {
    try {
      const { id, ...rest } = JSON.parse(this.state.contents);

      if (id !== this.state.entity!.id) {
        // if ID is changed, we need a special operation to update it first
        invoke("update_entity_id", {
          originalId: this.state.entity!.id,
          newId: id,
        })
          .finally(() =>
            invoke("update_entity_properties", {
              id: id,
              data: rest,
              complete: true,
            }),
          )
          .finally(() => {
            this.state.entity!.id = id;
            this.updateWindowTitle(true);
          });
      } else {
        invoke("update_entity_properties", {
          id: id,
          data: rest,
          complete: true,
        });
        this.updateWindowTitle(true);
      }
    } catch (e) {
      await message("Invalid formatting", {
        title: "Couldn't save entity",
        kind: "error",
      });
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
