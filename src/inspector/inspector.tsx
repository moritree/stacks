import { JSX, render } from "preact";
import "../style.css";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import { Info, Loader, Code } from "preact-feather";
import { Entity } from "../entity/entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";
const TabBar = lazy(() => import("../components/tab-bar/tab-bar"));
import TabItem from "../components/tab-bar/tab-item";
import { useEffect, useState } from "preact/hooks";
import Scripts from "./scripts-component/scripts-component";
import { lazy, Suspense } from "preact/compat";
import { invoke } from "@tauri-apps/api/core";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import CodeEditor from "../components/code-editor";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function Inspector() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [openScripts, setOpenScripts] = useState(new Set<string>());
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [scriptsContents, setScriptsContents] = useState<Map<string, string>>(
    new Map(),
  );
  const [editorHeights, setEditorHeights] = useState<Map<string, number>>(
    new Map(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let listeners: (() => void)[] = [];

    (async () => {
      listeners.push(
        await getCurrentWindow().onThemeChanged(({ payload: theme }) =>
          setTheme(theme),
        ),
      );
    })()
      .then(async () => setTheme((await getCurrentWindow().theme()) || "light"))
      .then(async () =>
        (async () => {
          listeners.push(
            await listen<{ id: string; table: string }>(
              "entity_string",
              (tableEvent) => {
                setInspectorContents(tableEvent.payload.table);
                getCurrentWebviewWindow().setFocus();
              },
            ),
          );
        })().then(async () =>
          (async () => {
            listeners.push(
              await listen<any>("provide_entity", (e) => {
                setOpenScripts(new Set<string>());
                const scripts = e.payload.scripts;
                setScriptsContents(new Map(Object.entries(scripts || {})));
                setEditorHeights(new Map());

                invoke("get_entity_string", {
                  id: e.payload.id,
                  window: getCurrentWindow().label,
                });
                setEntity(e.payload);
              }),
            );
          })().then(() => emit("mounted")),
        ),
      );

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const handleSave = async () => {
    if (!entity) {
      console.error("Can't save undefined entity");
      return;
    }
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
        title: "Could not save entity.",
        kind: "error",
      });
  };

  const handleRevert = async () => {
    if (!entity) {
      console.error("Can't revert inspector for undefined entity");
      return;
    }
    if (
      !(await confirm("This action cannot be reverted. Are you sure?", {
        title: "Revert changes",
        kind: "warning",
      }))
    )
      return;

    emitTo(getCurrentWindow().label, "provide_entity", entity);
  };

  useEffect(() => {
    if (entity != undefined) {
      if (!saved) setSaved(true);
      else getCurrentWindow().setTitle(entity.id);
    }
  }, [entity]);

  useEffect(() => {
    if (entity) getCurrentWindow().setTitle(entity.id + (saved ? "" : " *"));
  }, [saved]);

  useEffect(() => {
    if (!(entity && inspectorContents != "")) return;
    let listeners: (() => void)[] = [];
    (async () => {
      listeners.push(await listen<any>("save_entity", handleSave));
      listeners.push(await listen<any>("revert_entity", handleRevert));
    })();
    return () => listeners.forEach((unsubscribe) => unsubscribe());
  }, [entity, inspectorContents, scriptsContents]);

  if (!entity || inspectorContents == "")
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
          editorHeights={editorHeights}
          setEditorHeights={setEditorHeights}
          theme={theme}
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
      <div class="w-full h-full flex flex-col">
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

render(<Inspector />, document.getElementById("root")!);
