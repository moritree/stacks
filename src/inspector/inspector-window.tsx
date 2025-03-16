import { JSX, render } from "preact";
import "../style/main.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader, Code } from "preact-feather";
import { Entity } from "../entity/entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";
const TabBar = lazy(() => import("../components/tab-bar/tab-bar"));
import TabItem from "../components/tab-bar/tab-item";
import { useEffect, useState } from "preact/hooks";
import Scripts from "./scripts-component";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/ext-language_tools";
import { lazy, Suspense } from "preact/compat";
import Inspector from "./inspect-component";

export default function InspectorWindow() {
  const [editorTheme, setEditorTheme] = useState<string>(
    "github_light_default",
  );
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [openScripts, setOpenScripts] = useState(new Set<Number>());
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [scriptsContents, setScriptsContents] = useState<string[]>([]);

  useEffect(() => {
    console.log("SCRIPTS CONTENTS", scriptsContents);
  }, [scriptsContents]);

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupEntityUpdateListener() {
      listeners.push(
        await listen<Entity>("update_entity", (e) => {
          const { scripts, ...rest } = e.payload;
          setInspectorContents(JSON.stringify(rest, null, 2));
          setScriptsContents(
            e.payload.scripts
              ? Object.keys(e.payload.scripts).map(
                  (script) => e.payload.scripts[script],
                )
              : [],
          );
          setEntity(e.payload);
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
        <Inspector
          entity={entity}
          updateWindowTitle={updateWindowTitle}
          editorTheme={editorTheme}
          contents={inspectorContents}
          onContentsChange={setInspectorContents}
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
          onOpenScriptsChange={setOpenScripts}
          contents={scriptsContents}
          onContentsChange={setScriptsContents}
          editorTheme={editorTheme}
        />
      ),
    },
  ];

  return (
    <div class="w-screen h-screen flex flex-col">
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

render(<InspectorWindow />, document.getElementById("root")!);
