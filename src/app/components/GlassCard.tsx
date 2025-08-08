import React, { ElementType, PropsWithChildren } from "react";

/**
 * Polymorphic "as" component typing without `any`.
 * Usage: <GlassCard as="section">...</GlassCard> or <GlassCard as={Link} href="/x">...</GlassCard>
 */
type PolymorphicProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className">;

export default function GlassCard<T extends ElementType = "div">(
  props: PropsWithChildren<PolymorphicProps<T>>
) {
  const { as, className = "", children, ...rest } = props;
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={`glass inner-stroke rounded-2xl shadow-glass ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
