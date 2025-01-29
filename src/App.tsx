import { useEffect, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Entity from "./Entity";
import Moveable from "preact-moveable";

export default function App() {
  const [entities, setEntities] = useState<any>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedInitialPosition, setSelectedInitialPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

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

  // Calculate new position when entity is dragged
  const calculateNewPosition = (transform: string) => {
    // transform will be in the format "translate(Xpx, Ypx)"
    const matches = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (matches) {
      return {
        x: selectedInitialPosition.x + parseFloat(matches[1]),
        y: selectedInitialPosition.y + parseFloat(matches[2]),
      };
    }
    console.error("Drag transform format couldn't be parsed", transform);
    return selectedEntity.pos; // fallback
  };

  return (
    <div
      class="background"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedId(null);
      }}
    >
      {Object.entries(entities).map(([id, entity]) => (
        <Entity
          key={id}
          id={id}
          entity={entity}
          onSelect={(pos) => {
            setSelectedId(id);
            setSelectedInitialPosition(pos);
          }}
          isSelected={id === selectedId}
        />
      ))}
      {selectedEntity && (
        <Moveable
          target={`#${selectedId}`}
          draggable={true}
          onDrag={({ transform }) => {
            // Update position through backend
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
