import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import EntityComponent from "./entity/entity-component";
import Moveable, { OnDrag, OnRotate } from "preact-moveable";
import { Menu } from "@tauri-apps/api/menu";
import { save, open, message } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef, useState } from "preact/hooks";
import { Entity } from "./entity/entity-type";

const SCENE_BASE_SIZE = {
  width: 1280,
  height: 720,
};

export default function Scene() {
  const boundingRef = useRef(null);
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
  const [selectedInitialRotation, setSelectedInitialRotation] = useState(0);
  const selectedEntity = selectedId ? entities.get(selectedId) : null;

  useEffect(() => {
    let observer: ResizeObserver;
    if (boundingRef.current) {
      observer = new ResizeObserver((entries) =>
        entries.forEach(async (entry) => {
          const newScale = entry.contentRect.width / SCENE_BASE_SIZE.width;
          setTransformScale(1 / newScale);
          document.documentElement.style.setProperty(
            `--scene-scale`,
            newScale.toString(),
          );
        }),
      );

      observer.observe(boundingRef.current);
    }

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

    invoke("set_frontend_ready");

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedEntity && !selectedEntity.selectable) setSelectedId(undefined);
  }, [entities]);

  const handleDrag = (e: OnDrag) => {
    const ang = (selectedEntity?.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    const [rawDx, rawDy] = e.beforeTranslate;
    const [dx, dy] = [
      Math.round(10000 * (rawDx * cos - rawDy * sin)) / 10000,
      Math.round(10000 * (rawDx * sin + rawDy * cos)) / 10000,
    ];

    let startPos = selectedInitialPosition;
    if (e.isFirstDrag) {
      setSelectedInitialPosition(selectedEntity!.pos);
      startPos = selectedEntity!.pos;
    }

    invoke("update_entity", {
      id: selectedId,
      data: {
        pos: {
          x: startPos.x + dx * transformScale,
          y: startPos.y + dy * transformScale,
        },
      },
    });
  };

  const handleRotate = (e: OnRotate) => {
    let startRotate = selectedInitialRotation;
    if (e.isFirstDrag) {
      setSelectedInitialRotation(selectedEntity?.rotation || 0);
      startRotate = selectedEntity?.rotation || 0;
    }

    invoke("update_entity", {
      id: selectedId,
      data: { rotation: startRotate + e.beforeRotation },
    });
  };

  const addNewEntity = async (entity: Entity) => {
    // ensure unique id
    var unique_index: number = 0;
    while (entities.has("new_".repeat(unique_index) + entity.id)) {
      unique_index += 1;
    }
    entity.id = "new_".repeat(unique_index) + entity.id;

    // invoke add
    const [success, msg] = await invoke<[boolean, string]>("new_entity", {
      data: entity,
    });
    if (!success) {
      message(msg, {
        title: "Entity creation failed",
        kind: "error",
      });
    }
  };

  return (
    <div
      class="w-full aspect-video"
      ref={boundingRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedId(undefined);
      }}
      onContextMenu={async (e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        (
          await Menu.new({
            items: [
              { id: "save_scene", text: "Save Scene" },
              { id: "load_scene", text: "Load Scene" },
              { item: "Separator" },
              {
                id: "submenu",
                text: "Add New Entity",
                items: [
                  {
                    id: "add_text_entity",
                    text: "Text",
                    action: async () => {
                      addNewEntity({
                        id: "text_entity",
                        type: "text",
                        content: "text",
                        pos: {
                          x: e.x * transformScale,
                          y: e.y * transformScale,
                        },
                        scripts: {},
                      });
                    },
                  },
                  {
                    id: "add_rect_entity",
                    text: "rect",
                    action: async () => {
                      addNewEntity({
                        id: "rect_entity",
                        type: "rect",
                        pos: {
                          x: e.x * transformScale,
                          y: e.y * transformScale,
                        },
                        size: { width: 100, height: 100 },
                        color: "#ff0000",
                        scripts: {},
                      });
                    },
                  },
                  {
                    id: "add_text_input_entity",
                    text: "text_input",
                    action: async () => {
                      addNewEntity({
                        id: "text_input_entity",
                        type: "text_input",
                        pos: {
                          x: e.x * transformScale,
                          y: e.y * transformScale,
                        },
                        size: { width: 120, height: 40 },
                        color: "#aaaaaa",
                        scripts: {},
                      });
                    },
                  },
                ],
              },
            ],
          })
        ).popup();
      }}
    >
      {Array.from(entities).map(([id, entity]) => (
        <EntityComponent
          key={id}
          entity={entity}
          onSelect={(select) => setSelectedId(select ? id : undefined)}
          isSelected={id === selectedId}
        />
      ))}
      {selectedEntity && (
        <Moveable
          target={`#${selectedId}`}
          draggable={selectedEntity.selectable}
          rotatable={selectedEntity.selectable}
          onDrag={handleDrag}
          onRotate={handleRotate}
        />
      )}
    </div>
  );
}
