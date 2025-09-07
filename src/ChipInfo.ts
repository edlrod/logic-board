export default interface ChipInfo {
  minInputs: number;
  maxInputs: number | null;
  evaluate?(inputs: boolean[]): boolean;
  color?: string;
  icon?: string;
  iconElm?: HTMLImageElement;
}
