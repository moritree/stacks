import { useEffect, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Entity from "./Entity";
import Moveable from "preact-moveable";

export default function App() {
  const [entities, setEntities] = useState<any>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      invoke("tick", { dt });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // setup listener and immediately start handling updates
    let unlisten: () => void;
    const setup = async () => {
      unlisten = await listen<any>("scene_update", (e) => {
        setEntities(e.payload);
      });
    };

    setup();

    // clean up listener on unmount
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Get the selected entity if any
  const selectedEntity = selectedId ? entities[selectedId] : null;

  const calculateNewPosition = (transform: string) => {
    // transform will be in the format "translate(Xpx, Ypx)"
    const matches = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (matches) {
      return {
        x: selectedEntity.pos.x + parseFloat(matches[1]),
        y: selectedEntity.pos.y + parseFloat(matches[2]),
      };
    }
    console.warn("Drag transform format couldn't be parsed", transform);
    return selectedEntity.pos; // fallback
  };

  return (
    <div>
      {Object.entries(entities).map(([id, entity]) => (
        <Entity
          key={id}
          id={id}
          entity={entity}
          onSelect={() => setSelectedId(id)}
          isSelected={id === selectedId}
        />
      ))}
      {selectedEntity && (
        <Moveable
          target={`#${selectedId}`}
          draggable={true}
          onDrag={({ transform }) => {
            // Update position through backend
            // TODO: correct dong
            invoke("update_entity_property", {
              id: selectedId,
              key: "pos",
              data: calculateNewPosition(transform),
            });
          }}
        />
      )}
    </div>
  );
}
