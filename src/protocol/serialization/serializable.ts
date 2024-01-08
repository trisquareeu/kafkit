import type { WriteBuffer } from './write-buffer';

export interface Serializable {
  serialize(buffer: WriteBuffer): void | Promise<void>;
}
