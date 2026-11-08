/**
 * Document-level mutation history with undo/redo.
 *
 * Mutations are self-contained value objects with `do()` / `undo()` closures.
 * They encapsulate both the library mutation and the editor mirror update;
 * the UndoStack only owns ordering, coalescing and dirty bookkeeping hooks.
 */

export interface Mutation {
  /** Discriminator for coalescing and UI events ("SetCell", "AddRow", ...). */
  readonly kind: string;
  readonly label: string;
  /** Tables whose dirty state flips when this mutation is applied or reverted. */
  readonly affected: readonly string[];
  do(): void;
  undo(): void;
  /** Table renames transfer the dirty bookkeeping instead of += 1. */
  readonly transferDirty?: { readonly from: string; readonly to: string };
  /** Coalescing hints (SetCell only). */
  readonly table?: string;
  readonly rowIndex?: number;
  readonly column?: string;
  readonly oldValue?: string;
  readonly newValue?: string;
}

export interface StackHooks {
  /** Called after a mutation is applied and not part of a coalesced group. */
  onApply(mutation: Mutation): void;
  /** Called after a mutation is reverted (undo). */
  onRevert(mutation: Mutation): void;
  /** Called after every push/undo/redo so the UI can refresh undo/redo state. */
  onChange(): void;
  /**
   * Merges an incoming mutation into the top of the undo stack when they
   * describe consecutive changes of the same cell. Return null to record
   * separately.
   */
  coalesce?(top: Mutation, next: Mutation): Mutation | null;
}

export class UndoStack {
  private applied: Mutation[] = [];
  private reverted: Mutation[] = [];

  constructor(private readonly hooks: StackHooks) {}

  get canUndo(): boolean {
    return this.applied.length > 0;
  }

  get canRedo(): boolean {
    return this.reverted.length > 0;
  }

  /** Records and executes a mutation; consecutive same-cell edits coalesce. */
  push(mutation: Mutation): void {
    const top = this.applied[this.applied.length - 1];
    const merged = this.hooks.coalesce?.(top, mutation) ?? null;
    if (merged) {
      this.applied[this.applied.length - 1] = merged;
      mutation = merged;
    } else {
      this.applied.push(mutation);
    }
    this.reverted = [];

    mutation.do();
    if (!merged) {
      this.hooks.onApply(mutation);
    }
    this.hooks.onChange();
  }

  undo(): boolean {
    const mutation = this.applied.pop();
    if (!mutation) {
      return false;
    }
    mutation.undo();
    this.reverted.push(mutation);
    this.hooks.onRevert(mutation);
    this.hooks.onChange();
    return true;
  }

  redo(): boolean {
    const mutation = this.reverted.pop();
    if (!mutation) {
      return false;
    }
    mutation.do();
    this.applied.push(mutation);
    this.hooks.onApply(mutation);
    this.hooks.onChange();
    return true;
  }
}
