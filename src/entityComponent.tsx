import { invoke } from "@tauri-apps/api/core";

export default function entityComponent([id, entity]: [string, any]): any {
  let style;
  switch (entity.type) {
    case "text":
      style = {
        "--x": `${entity.pos.x}px`,
        "--y": `${entity.pos.y}px`,
      };
      break;
    case "rect":
      style = {
        "--x": `${entity.pos.x}px`,
        "--y": `${entity.pos.y}px`,
        "--width": `${entity.dimension.x}px`,
        "--height": `${entity.dimension.y}px`,
        "--color": `rgb(${entity.color.r}, ${entity.color.g}, ${entity.color.b})`,
      };
      break;
    default:
      console.warn("Invalid entity type", id, entity.type);
      return <></>;
  }

  return (
    <div
      class={"entity " + entity.type}
      id={id}
      style={style}
      draggable={entity.draggable}
      onClick={() => move_randomly(id)}
    >
      {entity.content && entity.content}
    </div>
  );
}

function move_randomly(id: string) {
  invoke("update_entity_property", {
    id: id,
    key: "pos",
    data: { x: 69, y: 420 },
  });
}
