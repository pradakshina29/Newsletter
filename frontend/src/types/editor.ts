export type ElementType = 'text' | 'image' | 'shape' | 'table' | 'qrcode' | 'divider';

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number; // 0 to 100
  rotation: number; // 0 to 360 degrees
  locked?: boolean;
  zIndex?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  wordSpacing?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  url: string;
  borderRadius: number;
  shadow: 'none' | 'sm' | 'md' | 'lg';
  border?: string; // e.g. "1px solid #000"
  mixBlendMode?: string;
  objectFit?: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'triangle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius?: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  cols: number;
  headers: string[];
  data: string[][]; // row-column array
}

export interface QrCodeElement extends BaseElement {
  type: 'qrcode';
  value: string;
  fgColor?: string;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  color: string;
  thickness: number;
}

export type CanvasElement = TextElement | ImageElement | ShapeElement | TableElement | QrCodeElement | DividerElement;

export interface Page {
  id: string;
  title?: string;
  status?: 'NOT_STARTED' | 'DRAFT' | 'COMPLETED';
  elements: CanvasElement[];
}

export interface ProjectData {
  id?: number;
  name: string;
  description?: string;
  category: string;
  department: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED';
  ownerId?: number;
  ownerName?: string;
  isTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
  content?: string; // Raw JSON from database
  // Serialized content details
  canvasWidth: number;
  canvasHeight: number;
  theme: ThemeConfig;
  pages: Page[];
  promptMetadata?: any;
}

export interface UserSession {
  token: string;
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  department: string;
}
