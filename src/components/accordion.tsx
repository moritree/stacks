import { ComponentChild } from "preact";
import { ChevronDown, ChevronRight } from "preact-feather";
import { useState } from "preact/hooks";

export default function Accordion(props: {
  label: string;
  children?: ComponentChild | ComponentChild[];
  open?: boolean;
  onToggle?: (isOpen: boolean) => void;
}) {
  const [open, setOpen] = useState<boolean>(props.open || false);

  return (
    <div class="w-full h-auto flex flex-col">
      <button
        class="text-sm w-full flex flex-row gap-2 p-1 bg-secondary border-b border-border"
        onClick={() => {
          props.onToggle?.(!open);
          setOpen(!open);
        }}
      >
        <div class="shrink-0">
          {(open && <ChevronDown size={20} />) || <ChevronRight size={20} />}
        </div>
        <span class="whitespace-nowrap overflow-hidden text-ellipsis">
          {props.label}
        </span>
      </button>
      {open && props.children}
    </div>
  );
}
