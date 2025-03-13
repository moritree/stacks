import { ComponentChild, VNode } from "preact";
import { useState } from "preact/hooks";
import TabItem from "./tab-item";

interface TabBarProps {
  children: ComponentChild | ComponentChild[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export default function TabBar(props: TabBarProps) {
  const [activeTab, setActiveTab] = useState(props.activeTab || 0);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    if (props.onTabChange) props.onTabChange(index);
  };

  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];

  return (
    <div class="w-screen flex flex-row border-b border-gray-200 bg-gray-100">
      {children.map((child, index) => {
        if (child && typeof child === "object" && "type" in child) {
          return (
            <TabItem
              {...(child as VNode<any>).props}
              isActive={index === activeTab}
              onClick={() => handleTabClick(index)}
              key={index}
            />
          );
        }
      })}
    </div>
  );
}
