import "unplugin-icons/types/svelte.js";

declare global {
  namespace App {
    interface Error {
      status: number;
      message: string;
    }
    interface PageState {
      page: number;
    }
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

export {};
