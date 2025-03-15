import { JSX, render } from "preact";
import "../style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader, Code } from "preact-feather";
import { Entity } from "../entity/entity-type";
import AceEditor from "react-ace";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { message } from "@tauri-apps/plugin-dialog";
const TabBar = lazy(() => import("../components/tab-bar/tab-bar"));
import TabItem from "../components/tab-bar/tab-item";
import { useEffect, useState } from "preact/hooks";
import Scripts from "./scripts-component";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/ext-language_tools";
import { lazy, Suspense } from "preact/compat";

export default function Inspector() {
  const [editorTheme, setEditorTheme] = useState<string>(
    "github_light_default",
  );
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [openScripts, setOpenScripts] = useState(new Set<Number>());

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
        await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
          console.log("Theme changed!", theme);
          setEditorTheme(
            theme == "light" ? "github_light_default" : "cloud9_night",
          );
        }),
      );
    }

    setupEntityUpdateListener().then(() => emit("mounted"));
    setupThemeChangeListener().then(async () =>
      setEditorTheme(
        (await getCurrentWindow().theme()) == "light"
          ? "github_light_default"
          : "cloud9_night",
      ),
    );

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (entity) {
      setOpenScripts(new Set<Number>());
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
        <AceEditor
          height="100%"
          mode="javascript"
          value={inspectorContents}
          onChange={handleChange}
          theme={editorTheme}
          setOptions={{
            tabSize: 2,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            showLineNumbers: true,
          }}
        />
      ),
    },
    {
      label: "Scripts",
      icon: <Code />,
      component: (
        <Scripts
          key={openScripts}
          entity={entity}
          openScripts={openScripts}
          onScriptsChange={setOpenScripts}
        />
      ),
    },
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
      <div class="flex-1 overflow-auto">{tabs[activeTab].component}</div>
      <Suspense
        fallback={
          <div class="flex justify-center">
            <Loader />
          </div>
        }
      >
        <TabBar onTabChange={(index) => setActiveTab(index)} atBottom>
          {tabs.map((tab) => (
            <TabItem>
              {tab.icon}
              {tab.label}
            </TabItem>
          ))}
        </TabBar>
      </Suspense>
    </div>
  );
}

render(<Inspector />, document.getElementById("root")!);
