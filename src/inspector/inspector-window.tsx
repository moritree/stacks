import { JSX, render } from "preact";
import "../style.css";
import { emit, listen } from "@tauri-apps/api/event";
import { Info, Loader, Code } from "preact-feather";
import { Entity } from "../entity/entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";
const TabBar = lazy(() => import("../components/tab-bar/tab-bar"));
import TabItem from "../components/tab-bar/tab-item";
import { useEffect, useState } from "preact/hooks";
import Scripts from "./scripts-component";
import { lazy, Suspense } from "preact/compat";
import { platform } from "@tauri-apps/plugin-os";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import CodeEditor from "../components/code-editor";

export default function InspectorWindow() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [openScripts, setOpenScripts] = useState(new Set<string>());
  const [addScriptsOpen, setAddScriptsOpen] = useState(false);
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [scriptsContents, setScriptsContents] = useState<Map<string, string>>(
    new Map(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupEntityUpdateListener() {
      listeners.push(
        await listen<any>("provide_entity", (e) => {
          setOpenScripts(new Set<string>());
          const scripts = e.payload.scripts;
          setScriptsContents(new Map(Object.entries(scripts || {})));

          invoke("get_entity_string", {
            id: e.payload.id,
            window: getCurrentWindow().label,
          });
          setEntity(e.payload);
        }),
      );
    }

    async function setupEntityStringListener() {
      listeners.push(
        await listen<{ id: string; table: string }>(
          "entity_string",
          (tableEvent) => {
            setInspectorContents(tableEvent.payload.table);
          },
        ),
      );
    }

    async function setupThemeChangeListener() {
      listeners.push(
        await getCurrentWindow().onThemeChanged(({ payload: theme }) =>
          setTheme(theme),
        ),
      );
    }

    setupThemeChangeListener()
      .then(async () => setTheme((await getCurrentWindow().theme()) || "light"))
      .then(() =>
        setupEntityStringListener()
          .then(() => setupEntityUpdateListener())
          .then(() => emit("mounted")),
      );

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (entity != undefined) {
      if (!saved) setSaved(true);
      else getCurrentWindow().setTitle(entity.id);
    }
  }, [entity]);

  useEffect(() => {
    if (entity) getCurrentWindow().setTitle(entity.id + (saved ? "" : " *"));
  }, [saved]);

  if (!entity || inspectorContents == "")
    return (
      <div class="w-screen h-screen flex flex-col justify-center">
        <Loader class="w-screen h-10" />
      </div>
    );

  const handleSave = async () => {
    const [success, msg, id] = await invoke<[boolean, string, string]>(
      "handle_inspector_save",
      {
        originalId: entity.id,
        inspector: inspectorContents,
        scripts: scriptsContents,
      },
    );

    if (success) {
      if (entity.id != id) entity.id = id;
      setSaved(true);
    } else
      message(msg, {
        title: "Could not save entity",
        kind: "error",
      });
  };

  const tabs: { label: string; icon: JSX.Element; component: JSX.Element }[] = [
    {
      label: "Inspect",
      icon: <Info />,
      component: (
        <CodeEditor
          name="inspector-editor"
          value={inspectorContents}
          onChange={(newVal) => {
            setInspectorContents(newVal);
            setSaved(false);
          }}
          theme={theme}
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
          onContentsChange={(newVal) => {
            setScriptsContents(newVal);
            setSaved(false);
          }}
          theme={theme}
          addScriptsOpen={addScriptsOpen}
          onAddScriptsOpenChange={() => setAddScriptsOpen(!addScriptsOpen)}
        />
      ),
    },
  ];

  return (
    <Suspense
      fallback={
        <div class="flex justify-center">
          <Loader />
        </div>
      }
    >
      <div
        class="w-screen h-screen flex flex-col"
        onKeyUp={(e) => {
          const os = platform();
          if ((os == "macos" ? e.metaKey : e.ctrlKey) && e.code === "KeyS")
            handleSave();
        }}
      >
        <div class="flex-1 overflow-auto">{tabs[activeTab].component}</div>
        <TabBar onTabChange={(index) => setActiveTab(index)} atBottom>
          {tabs.map((tab) => (
            <TabItem>
              {tab.icon}
              {tab.label}
            </TabItem>
          ))}
        </TabBar>
      </div>
    </Suspense>
  );
}

render(<InspectorWindow />, document.getElementById("root")!);
