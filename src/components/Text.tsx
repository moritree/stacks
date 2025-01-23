interface TextProps {
  pos: Position;
  content: string;
}

export function Text({ pos, content }: TextProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
      }}
    >
      {content}
    </div>
  );
}
