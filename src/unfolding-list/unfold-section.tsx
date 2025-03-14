import { ComponentChild } from "preact";
import { ChevronDown, ChevronRight } from "preact-feather";
import { useState } from "preact/hooks";

export default function UnfoldSection(props: {
  label: string;
  children?: ComponentChild | ComponentChild[];
  open?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(props.open || false);

  return (
    <div class="w-full h-auto flex flex-col">
      <button
        class="text-sm w-full flex flex-row gap-2 p-1 bg-gray-100 border-b border-gray-200"
        onClick={() => setOpen(!open)}
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
