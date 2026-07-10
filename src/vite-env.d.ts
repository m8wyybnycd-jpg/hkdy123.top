/// <reference types="vite/client" />

declare module "critters" {
  export default class Critters {
    constructor(options?: Record<string, unknown>);
    process(html: string): Promise<string>;
  }
}
