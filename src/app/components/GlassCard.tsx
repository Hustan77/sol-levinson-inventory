import React from "react";

export default function GlassCard({
  children,
  className = "",
  as: Tag = "div",
}: React.PropsWithChildren<{ className?: string; as?: any }>) {
  return (
    <Tag className={`glass inner-stroke rounded-2xl shadow-glass ${className}`}>
      {children}
    </Tag>
  );
}
