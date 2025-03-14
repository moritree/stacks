import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import EntityComponent from "./entity/entity-component";
import Moveable from "preact-moveable";
import { Menu } from "@tauri-apps/api/menu";
import { save, open } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useState } from "preact/hooks";

const SCENE_BASE_SIZE = {
  width: 1280,
  height: 720,
};

async function handleContextMenu(event: Event) {
  event.preventDefault();
  (
    await Menu.new({
      items: [
        {
          id: "save_scene",
          text: "Save Scene",
          action: async (_: string) =>
            await invoke("save_scene", {
              path: await save({
                filters: [
                  {
                    name: "scene",
                    extensions: ["txt"],
                  },
                ],
              }),
            }),
        },
        {
          id: "load_scene",
          text: "Load Scene",
          action: async (_: string) =>
            await invoke("load_scene", {
              path: await open({
                multiple: false,
                directory: false,
              }),
            }),
        },
      ],
    })
  ).popup();
}

export default function Scene() {
  const [entities, setEntities] = useState<any>({});
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
  const selectedEntity = selectedId ? entities[selectedId] : null;

  useEffect(() => {
    let listeners: (() => void)[] = [];

    async function setupUpdateListener() {
      const unsubscribe = await listen<any>("scene_update", (e) => {
        setEntities(e.payload);
      });
      listeners.push(unsubscribe);
    }

    async function setupResizeListener() {
      const unsubscribe = await listen<any>("tauri://resize", async (e) => {
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
      });
      listeners.push(unsubscribe);

      emit("tauri://resize", await WebviewWindow.getCurrent().size()); // emit at setup
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

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const calculateNewPosition = (transform: string) => {
    // transform will be, annoyingly, in the format "translate(Xpx, Ypx)"
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

  const handleDrag = ({ transform }: { transform: string }) => {
    // Update position through backend
    invoke("update_entity_property", {
      id: selectedId,
      key: "pos",
      data: calculateNewPosition(transform),
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
      {Object.entries(entities).map(([id, entity]) => (
        <EntityComponent
          key={id}
          id={id}
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
          draggable={true}
          onDrag={handleDrag}
          className="[z-index:0!important]"
        />
      )}
    </div>
  );
}
