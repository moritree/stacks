import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import EntityComponent from "./entity/entity-component";
import Moveable from "preact-moveable";
import { Menu } from "@tauri-apps/api/menu";
import { save, open } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useState } from "preact/hooks";
import { Entity } from "./entity/entity-type";

const SCENE_BASE_SIZE = {
  width: 1280,
  height: 720,
};

async function saveScene() {
  await invoke("save_scene", {
    path: await save({
      filters: [{ name: "scene", extensions: ["txt"] }],
    }),
  });
}

async function openScene() {
  await invoke("load_scene", {
    path: await open({
      multiple: false,
      directory: false,
    }),
  });
}

async function handleContextMenu(event: Event) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        { id: "save_scene", text: "Save Scene" },
        { id: "load_scene", text: "Load Scene" },
      ],
    })
  ).popup();
}

export default function Scene() {
  const [entities, setEntities] = useState<Map<string, Entity>>(new Map());
  const [transformScale, setTransformScale] = useState<number>(1);
  const [lastTime, setLastTime] = useState(performance.now());
  const [animationFrameId, setAnimationFrameId] = useState<
    number | undefined
  >();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [selectedInitialPosition, setSelectedInitialPosition] = useState({
    x: 0,
    y: 0,
  });
  const selectedEntity = selectedId ? entities.get(selectedId) : null;

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupUpdateListener() {
      const unsubscribe = await listen<{ [id: string]: Partial<Entity> }>(
        "scene_update",
        (e) => {
          setEntities(
            new Map(
              Object.entries(e.payload).map(([id, ent]) => [
                id,
                { ...ent, id: id } as Entity,
              ]),
            ),
          );
        },
      );
      listeners.push(unsubscribe);
    }

    async function setupSelectEntityListener() {
      const unsubscribe = await listen<string | undefined>(
        "select_entity",
        (e) => {
          setSelectedId(e.payload);
        },
      );

      listeners.push(unsubscribe);
    }

    async function setupResizeListener() {
      const unsubscribe = await listen<{ width: number; height: number }>(
        "tauri://resize",
        async (e) => {
          // Do nothing if the window being resized is a different one
          // Yes this is janky and I should write a better solution
          const thisWindowSize = await WebviewWindow.getCurrent().size();
          if (
            thisWindowSize.width != e.payload.width ||
            thisWindowSize.height != e.payload.height
          ) {
            return;
          }

          setSelectedId(undefined);

          const scaleFactor: number = await invoke("window_scale");
          const contentHeight = document.documentElement.clientHeight; // content area dimensions (excluding title bar)
          const windowHeight = e.payload.height; // gives us the full window dimensions
          const titleBarHeight = windowHeight / scaleFactor - contentHeight; // Calculate title bar height dynamically

          const newScale = e.payload.width / SCENE_BASE_SIZE.width;
          setTransformScale(scaleFactor / newScale);

          invoke("resize_window", {
            width: Math.round(SCENE_BASE_SIZE.width * newScale),
            height: Math.round(
              SCENE_BASE_SIZE.height * newScale + titleBarHeight * scaleFactor,
            ),
          });
          document.documentElement.style.setProperty(
            `--scene-scale`,
            newScale / scaleFactor + "",
          );
        },
      );
      listeners.push(unsubscribe);

      emit("tauri://resize", await WebviewWindow.getCurrent().size()).then(() =>
        invoke("set_frontend_ready"),
      );
    }

    async function setupFileOperationListener() {
      const unsubscribe = await listen<string>("file_operation", (e) => {
        switch (e.payload) {
          case "open_scene": {
            openScene();
            break;
          }
          case "save_scene": {
            saveScene();
            break;
          }
          default:
            console.warn("Unhandled file operation", e.payload);
        }
      });
      listeners.push(unsubscribe);
    }

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      setLastTime(now);
      invoke("tick", { dt });
      setAnimationFrameId(requestAnimationFrame(tick));
    };
    setAnimationFrameId(requestAnimationFrame(tick));

    setupUpdateListener();
    setupResizeListener();
    setupSelectEntityListener();
    setupFileOperationListener();

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleEntitySelect = (
    id: string,
    pos: { x: number; y: number },
    selectable: boolean,
  ) => {
    if (selectable) {
      setSelectedId(id);
      setSelectedInitialPosition(pos);
    } else {
      setSelectedId(undefined);
    }
  };

  const calculateNewPosition = (transform: string) => {
    // transform will be, annoyingly, a string in the format "translate(Xpx, Ypx)"
    const matches = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (matches) {
      return {
        x: selectedInitialPosition.x + parseFloat(matches[1]) * transformScale,
        y: selectedInitialPosition.y + parseFloat(matches[2]) * transformScale,
      };
    }
    console.error("Drag transform format couldn't be parsed", transform);
    return selectedEntity?.pos; // fallback
  };

  const handleDrag = ({ transform }: { transform: string }) => {
    invoke("update_entity", {
      id: selectedId,
      data: { pos: calculateNewPosition(transform) },
    });
  };

  return (
    <div
      class="w-screen h-screen z-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedId(undefined);
      }}
      onContextMenu={(e) =>
        e.target === e.currentTarget && handleContextMenu(e)
      }
    >
      {Array.from(entities).map(([id, entity]) => (
        <EntityComponent
          key={id}
          entity={entity}
          onSelect={(pos, selectable) =>
            handleEntitySelect(id, pos, selectable)
          }
          isSelected={id === selectedId}
        />
      ))}
      {selectedEntity && (
        <Moveable
          target={`#${selectedId}`}
          draggable={selectedEntity.draggable || false}
          onDrag={handleDrag}
          className="[z-index:0!important]"
        />
      )}
    </div>
  );
}
