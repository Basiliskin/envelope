import { makeAutoObservable } from "mobx";
import { FileBasket, type FileBasketEntry } from "../../domain/composer/file-basket.js";
import {
  FileBasketCapExceededError,
} from "../../domain/composer/file-basket.js";

export class FileBasketStore {
  basket: FileBasket = FileBasket.empty();
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get entries(): readonly FileBasketEntry[] {
    return this.basket.snapshot();
  }

  get totalBytes(): number {
    return this.basket.totalBytes();
  }

  get isEmpty(): boolean {
    return this.basket.isEmpty();
  }

  add(entry: FileBasketEntry): void {
    try {
      this.basket = this.basket.withEntry(entry);
      this.error = null;
    } catch (caught) {
      this.error =
        caught instanceof FileBasketCapExceededError
          ? caught.message
          : "Unable to add file.";
    }
  }

  remove(id: string): void {
    this.basket = this.basket.withoutEntry(id);
  }

  reset(): void {
    this.basket = FileBasket.empty();
    this.error = null;
  }
}
