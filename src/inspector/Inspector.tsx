import { JSX, render } from "preact";
import "../style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader, Code } from "preact-feather";
import { Entity } from "../entity/entity";
import { Editor } from "../text-editor/ace-editor";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { message } from "@tauri-apps/plugin-dialog";
import TabBar from "../tab-bar/tab-bar";
import TabItem from "../tab-bar/tab-item";
import { useEffect, useState } from "preact/hooks";

export default function Inspector() {
  const [theme, setTheme] = useState<string>("github_light_default");
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupEntityUpdateListener() {
      listeners.push(
        await listen<any>("update_entity", (e) => {
          setEntity(e.payload.entity);
          setInspectorContents(JSON.stringify(e.payload.entity, null, 2));
        }),
      );
    }

    async function setupThemeChangeListener() {
      listeners.push(
        await getCurrentWindow().onThemeChanged(({ payload: theme }) =>
          setTheme(theme == "light" ? "github_light_default" : "github_dark"),
        ),
      );
    }

    setupEntityUpdateListener().then(() => emit("mounted"));
    setupThemeChangeListener().then(async () =>
      setTheme(
        (await getCurrentWindow().theme()) == "light"
          ? "github_light_default"
          : "github_dark",
      ),
    );

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (entity) {
      // update title whenever entity is updated
      updateWindowTitle(true);
    }
  }, [entity]);

  const updateWindowTitle = async (saved: boolean) => {
    getCurrentWindow().setTitle(entity!.id + (saved ? "" : " *"));
  };

  const handleSave = async () => {
    try {
      const { id, ...rest } = JSON.parse(inspectorContents);

      if (id !== entity!.id) {
        // if ID is changed, we need a special operation to update it first
        invoke("update_entity_id", {
          originalId: entity!.id,
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
            entity!.id = id;
            updateWindowTitle(true);
          });
      } else {
        invoke("update_entity_properties", {
          id: id,
          data: rest,
          complete: true,
        });
        updateWindowTitle(true);
      }
    } catch (e) {
      await message("Invalid formatting", {
        title: "Couldn't save entity",
        kind: "error",
      });
    }
  };

  const handleChange = (newVal: string) => {
    setInspectorContents(newVal);
    updateWindowTitle(false);
  };

  if (!entity)
    return (
      <div class="w-screen h-screen flex flex-col justify-center">
        <Loader class="w-screen h-10" />
      </div>
    );

  const tabs: { label: string; icon: JSX.Element; component: JSX.Element }[] = [
    {
      label: "Inspect",
      icon: <Info />,
      component: (
        <Editor
          value={inspectorContents}
          onChange={handleChange}
          mode="javascript"
          theme={theme}
        />
      ),
    },
    { label: "Scripts", icon: <Code />, component: <Loader /> },
  ];

  return (
    <div
      class="w-screen h-screen flex flex-col"
      onKeyUp={(e) => {
        const os = platform();
        if (
          ((os == "macos" && e.metaKey) || (os != "macos" && e.ctrlKey)) &&
          e.code === "KeyS"
        )
          handleSave();
      }}
    >
      <TabBar onTabChange={(index) => setActiveTab(index)}>
        {tabs.map((tab) => (
          <TabItem>
            {tab.icon}
            {tab.label}
          </TabItem>
        ))}
      </TabBar>
      {tabs[activeTab].component}
    </div>
  );
}

render(<Inspector />, document.getElementById("root")!);
