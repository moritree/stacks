import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import EntityComponent from "./entity/entity-component";
import Moveable, { OnDrag } from "preact-moveable";
import { Menu } from "@tauri-apps/api/menu";
import { save, open, message } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useState } from "preact/hooks";
import { Entity } from "./entity/entity-type";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Selecto from "preact-selecto";

const SCENE_BASE_SIZE = {
  width: 1280,
  height: 720,
};

export default function Scene() {
  const [entities, setEntities] = useState<Map<string, Entity>>(new Map());
  const [transformScale, setTransformScale] = useState<number>(1);
  const [lastTime, setLastTime] = useState(performance.now());
  const [animationFrameId, setAnimationFrameId] = useState<
    number | undefined
  >();
  const [selectedEntities, setSelectedEntities] = useState<{
    entities: Map<string, [Entity, { x: number; y: number }]>;
  }>({ entities: new Map() });

  useEffect(() => {
    let listeners: (() => void)[] = [];

    (async () =>
      listeners.push(
        await listen<{ [id: string]: Partial<Entity> }>("scene_update", (e) => {
          setEntities(
            new Map(
              Object.entries(e.payload).map(([id, ent]) => [
                id,
                { ...ent, id: id } as Entity,
              ]),
            ),
          );
        }),
      ))();

    (async () =>
      listeners.push(
        await listen<string | undefined>("select_entity", (e) => {
          const entity = e.payload && entities.get(e.payload);
          if (entity && e.payload) {
            selectedEntities.entities.set(e.payload, [entity, entity.pos]);
            setSelectedEntities({ entities: selectedEntities.entities });
          } else setSelectedEntities({ entities: new Map() });
        }),
      ))();

    (async () => {
      listeners.push(
        await getCurrentWindow().listen<{
          width: number;
          height: number;
        }>("tauri://resize", async (e) => {
          setSelectedEntities({ entities: new Map() });

          const scaleFactor: number = await invoke("window_scale");
          const contentHeight = document.documentElement.clientHeight; // content area dimensions (excluding title bar)
          const windowHeight = e.payload.height; // full window dimensions
          const titleBarHeight = windowHeight / scaleFactor - contentHeight; // calculate title bar height dynamically

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
            (newScale / scaleFactor).toString(),
          );
        }),
      );

      emit("tauri://resize", await WebviewWindow.getCurrent().size()).then(() =>
        invoke("set_frontend_ready"),
      );
    })();

    (async () => {
      listeners.push(
        await listen<string>("file_operation", async (e) => {
          if (e.payload == "open_scene") {
            const path = await open({
              multiple: false,
              directory: false,
            }).catch(() => {
              message("Failed to open file selection dialog", {
                kind: "error",
              });
            });
            if (path) {
              const [success, msg] = await invoke<[boolean, string]>(
                "load_scene",
                { path: path },
              );
              if (!success) {
                message(msg, { title: `Error`, kind: "error" });
                return;
              }
              const inspector = await WebviewWindow.getByLabel("inspector");
              if (inspector) inspector.close();
            }
          } else if (e.payload == "save_scene") {
            invoke("save_scene", {
              path: await save({
                filters: [{ name: "scene", extensions: ["txt"] }],
              }),
            });
          } else console.warn("Unhandled file operation", e.payload);
        }),
      );
    })();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      setLastTime(now);
      invoke("tick", { dt });
      setAnimationFrameId(requestAnimationFrame(tick));
    };
    setAnimationFrameId(requestAnimationFrame(tick));

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    // deselect entity if it is no longer selectable
    [...selectedEntities.entities].forEach(([id, [entity, _]]) => {
      if (entity.selectable) selectedEntities.entities.delete(id);
    });
    setSelectedEntities({ entities: selectedEntities.entities });
  }, [entities]);

  const handleEntitySelect = (id: string) => {
    if (id in selectedEntities.entities.keys()) return;
    const entity = entities.get(id);
    if (!entity)
      console.error("Can't select an entity which is not found on the scene.");
    else if (entity.selectable) {
      selectedEntities.entities.set(id, [entity, entity.pos]);
      setSelectedEntities({ entities: selectedEntities.entities });
    } else setSelectedEntities({ entities: new Map() });
  };

  const handleDrag = (events: OnDrag[]) => {
    events.forEach((e) => {
      const [entity, startPos] = selectedEntities.entities.get(e.target.id)!;

      const ang = (entity.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);

      const [rawDx, rawDy] = e.beforeTranslate;
      const [dx, dy] = [rawDx * cos - rawDy * sin, rawDx * sin + rawDy * cos];

      invoke("update_entity", {
        id: entity.id,
        data: {
          pos: {
            x: Math.round(startPos.x + dx * transformScale),
            y: Math.round(startPos.y + dy * transformScale),
          },
        },
      });
    });
  };

  const handleRotate = ({ rotate }: { rotate: number }) => {
    // invoke("update_entity", { id: selectedIds, data: { rotation: rotate } });
  };

  return (
    <div
      class="w-screen h-screen z-0"
      onClick={(e) => {
        if (e.target === e.currentTarget)
          setSelectedEntities({ entities: new Map() });
      }}
      onContextMenu={async (e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        (
          await Menu.new({
            items: [
              { id: "save_scene", text: "Save Scene" },
              { id: "load_scene", text: "Load Scene" },
            ],
          })
        ).popup();
      }}
    >
      {Array.from(entities).map(([id, entity]) => (
        <EntityComponent
          key={id}
          entity={entity}
          onSelect={() => handleEntitySelect(id)}
          isSelected={id in selectedEntities.entities.keys()}
        />
      ))}
      <Moveable
        target={[[...selectedEntities.entities].map(([id, _]) => `#${id}`)]}
        draggable={true}
        rotatable={true}
        onDrag={(e) => handleDrag([e])}
        // onRotate={handleRotate}
        className="[z-index:0!important]"
        onDragGroup={({ events }) => {
          handleDrag(events);
        }}
      />
      {/* {selectedEntities.entities.size == 0 && (
        <Selecto
          container={document.body}
          selectableTargets={[document.querySelector(".selectable") as any]}
          onSelect={(e) => {
            // e.added.forEach((el) => {
            //   // el.style.
            // });
          }}
        />
      )} */}
    </div>
  );
}
