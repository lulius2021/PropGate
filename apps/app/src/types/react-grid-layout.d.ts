declare module "react-grid-layout" {
  import { ComponentType } from "react";

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface Layouts {
    [P: string]: Layout[];
  }

  export interface ResponsiveProps {
    [key: string]: unknown;
  }

  export const Responsive: ComponentType<ResponsiveProps>;

  export function WidthProvider<P>(
    component: ComponentType<P>
  ): ComponentType<P>;
}

declare module "react-grid-layout/css/styles.css";
declare module "react-resizable/css/styles.css";
