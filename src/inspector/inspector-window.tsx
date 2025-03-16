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
import { platform } from "@tauri-apps/plugin-os";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";

export default function InspectorWindow() {
  const [editorTheme, setEditorTheme] = useState<string>(
    "github_light_default",
  );
  const [activeTab, setActiveTab] = useState<number>(0);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [openScripts, setOpenScripts] = useState(new Set<string>());
  const [inspectorContents, setInspectorContents] = useState<string>("");
  const [scriptsContents, setScriptsContents] = useState<Map<string, string>>(
    new Map(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupEntityUpdateListener() {
      listeners.push(
        await listen<any>("update_entity", (e) => {
          const { scripts, ...rest } = e.payload;
          setInspectorContents(JSON.stringify(rest, null, 2));
          setOpenScripts(new Set<string>());
          setScriptsContents(
            scripts ? new Map(Object.entries(scripts)) : new Map(),
          );
          setEntity(e.payload);
        }),
      );
    }

    async function setupThemeChangeListener() {
      listeners.push(
        await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
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
    if (entity) setSaved(true);
  }, [entity]);

  useEffect(() => {
    if (entity) getCurrentWindow().setTitle(entity.id + (saved ? "" : " *"));
  }, [saved]);

  if (!entity)
    return (
      <div class="w-screen h-screen flex flex-col justify-center">
        <Loader class="w-screen h-10" />
      </div>
    );

  const handleSave = async () => {
    const { scripts, ...rest } = entity;
    let updateData: Partial<Entity> = {};

    // deep equality
    const isEqual = (a: any, b: any): boolean => {
      if (a === b) return true;
      if (typeof a !== "object" || typeof b !== "object") return false;
      if (a === null || b === null) return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      return keysA.every((key) => isEqual(a[key], b[key]));
    };

    // save inspector
    // TODO data validation
    try {
      const parsedInspectorContents = JSON.parse(inspectorContents);

      const jsonDiff = Object.keys({
        ...rest,
        ...parsedInspectorContents,
      }).reduce<Record<string, any>>((diff, key) => {
        const entityValue = (entity as Record<string, any>)[key];
        const inspectorValue = (parsedInspectorContents as Record<string, any>)[
          key
        ];

        if (!isEqual(inspectorValue, entityValue)) {
          diff[key] = inspectorValue ?? null;
        }
        return diff;
      }, {});

      updateData = jsonDiff;
    } catch (e) {
      await message("Invalid formatting in inspector", {
        title: "Couldn't save entity",
        kind: "error",
      });
      return;
    }

    // save scripts
    // TODO error handling here
    const newScripts = Object.fromEntries(scriptsContents);
    if (!isEqual(scripts, newScripts))
      updateData = {
        ...updateData,
        scripts: Object.fromEntries(
          Array.from(scriptsContents).map(([k, v]) => [k, { string: v }]),
        ),
      };

    if (Object.keys(updateData).length > 0) {
      invoke("update_entity", {
        id: entity.id,
        data: updateData,
      });
      if (updateData.id) entity.id = updateData.id;
    }
    setSaved(true);
  };

  const tabs: { label: string; icon: JSX.Element; component: JSX.Element }[] = [
    {
      label: "Inspect",
      icon: <Info />,
      component: (
        <Inspector
          entity={entity}
          editorTheme={editorTheme}
          contents={inspectorContents}
          onContentsChange={(newVal) => {
            setInspectorContents(newVal);
            setSaved(false);
          }}
        />
      ),
    },
    {
      label: "Scripts",
      icon: <Code />,
      component: (
        <Scripts
          entity={entity}
          openScripts={openScripts}
          onOpenScriptsChange={setOpenScripts}
          contents={scriptsContents}
          onContentsChange={(newVal) => {
            setScriptsContents(newVal);
            setSaved(false);
          }}
          editorTheme={editorTheme}
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

render(<InspectorWindow />, document.getElementById("root")!);
