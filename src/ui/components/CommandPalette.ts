/**
 * CommandPalette Component
 * Keyboard-driven command interface with fuzzy search
 */

export interface Command {
  id: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  keywords?: string[];
  enabled?: boolean;
}

export interface CommandPaletteConfig {
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
  recentLimit?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onSelect?: (command: Command) => void;
  className?: string;
}

export class CommandPalette {
  private container: HTMLElement | null = null;
  private config: CommandPaletteConfig;
  private commands: Command[] = [];
  private filteredCommands: Command[] = [];
  private recentCommands: string[] = [];
  private selectedIndex: number = 0;
  private isOpen: boolean = false;
  private inputEl: HTMLInputElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private backdropEl: HTMLElement | null = null;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private readonly RECENT_STORAGE_KEY = 'command-palette-recent';

  constructor(config: CommandPaletteConfig = {}) {
    this.config = {
      placeholder: config.placeholder || 'Search commands...',
      emptyMessage: config.emptyMessage || 'No commands found',
      maxResults: config.maxResults || 10,
      recentLimit: config.recentLimit || 5,
      ...config
    };

    this.loadRecentCommands();
    this.attachGlobalKeyboardListener();
  }

  private attachGlobalKeyboardListener(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      // Check for ⌘K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      // ESC to close if open
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  private loadRecentCommands(): void {
    try {
      const stored = localStorage.getItem(this.RECENT_STORAGE_KEY);
      this.recentCommands = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.recentCommands = [];
    }
  }

  private saveRecentCommand(commandId: string): void {
    // Add to front of recent commands
    this.recentCommands = [
      commandId,
      ...this.recentCommands.filter(id => id !== commandId)
    ].slice(0, this.config.recentLimit!);

    try {
      localStorage.setItem(this.RECENT_STORAGE_KEY, JSON.stringify(this.recentCommands));
    } catch (e) {
      console.warn('Failed to save recent commands', e);
    }
  }

  private render(): void {
    if (!this.isOpen) return;

    // Create container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'command-palette-container';
      document.body.appendChild(this.container);
    }

    const html = `
      <div class="command-palette-backdrop" aria-hidden="true"></div>
      <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command Palette">
        <div class="command-palette__header">
          <div class="command-palette__search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              class="command-palette__input"
              placeholder="${this.config.placeholder}"
              aria-label="Search commands"
              autocomplete="off"
              spellcheck="false"
            />
            <kbd class="command-palette__shortcut">ESC</kbd>
          </div>
        </div>

        <div class="command-palette__results" role="listbox" aria-label="Commands">
          ${this.renderResults()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Get element references
    this.backdropEl = this.container.querySelector('.command-palette-backdrop');
    this.inputEl = this.container.querySelector('.command-palette__input');
    this.resultsEl = this.container.querySelector('.command-palette__results');

    // Focus input
    this.inputEl?.focus();

    // Attach event listeners
    this.attachEventListeners();
  }

  private renderResults(): string {
    if (this.filteredCommands.length === 0) {
      return `
        <div class="command-palette__empty">
          <span class="material-symbols-outlined">search_off</span>
          <span>${this.config.emptyMessage}</span>
        </div>
      `;
    }

    // Group commands by category
    const grouped = this.groupCommandsByCategory(this.filteredCommands);

    return Object.entries(grouped).map(([category, commands]) => `
      ${category !== 'undefined' ? `
        <div class="command-palette__category">${category}</div>
      ` : ''}
      ${commands.map((cmd, index) => {
        const globalIndex = this.filteredCommands.indexOf(cmd);
        const isSelected = globalIndex === this.selectedIndex;
        const isRecent = this.recentCommands.includes(cmd.id);

        return `
          <div
            class="command-palette__item ${isSelected ? 'command-palette__item--selected' : ''}"
            role="option"
            aria-selected="${isSelected}"
            data-command-id="${cmd.id}"
            data-index="${globalIndex}"
          >
            ${cmd.icon ? `
              <span class="command-palette__item-icon material-symbols-outlined" aria-hidden="true">
                ${cmd.icon}
              </span>
            ` : ''}
            <div class="command-palette__item-content">
              <div class="command-palette__item-label">
                ${cmd.label}
                ${isRecent ? '<span class="command-palette__item-badge">Recent</span>' : ''}
              </div>
              ${cmd.description ? `
                <div class="command-palette__item-description">${cmd.description}</div>
              ` : ''}
            </div>
            ${cmd.shortcut ? `
              <kbd class="command-palette__item-shortcut">${cmd.shortcut}</kbd>
            ` : ''}
          </div>
        `;
      }).join('')}
    `).join('');
  }

  private groupCommandsByCategory(commands: Command[]): Record<string, Command[]> {
    return commands.reduce((groups, cmd) => {
      const category = cmd.category || 'undefined';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
      return groups;
    }, {} as Record<string, Command[]>);
  }

  private attachEventListeners(): void {
    if (!this.inputEl || !this.resultsEl || !this.backdropEl) return;

    // Input event for search
    this.inputEl.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.search(query);
    });

    // Keyboard navigation
    this.inputEl.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          this.executeSelected();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    });

    // Click on result
    this.resultsEl.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.command-palette__item');
      if (item) {
        const index = parseInt(item.getAttribute('data-index') || '0', 10);
        this.selectedIndex = index;
        this.executeSelected();
      }
    });

    // Click on backdrop to close
    this.backdropEl.addEventListener('click', () => {
      this.close();
    });
  }

  private search(query: string): void {
    if (!query) {
      // Show recent commands if no query
      const recentCmds = this.recentCommands
        .map(id => this.commands.find(cmd => cmd.id === id))
        .filter(Boolean) as Command[];

      this.filteredCommands = [
        ...recentCmds,
        ...this.commands.filter(cmd => !this.recentCommands.includes(cmd.id))
      ].slice(0, this.config.maxResults!);
    } else {
      // Fuzzy search
      this.filteredCommands = this.fuzzySearch(query).slice(0, this.config.maxResults!);
    }

    this.selectedIndex = 0;
    this.updateResults();
  }

  private fuzzySearch(query: string): Command[] {
    const q = query.toLowerCase();

    return this.commands
      .filter(cmd => cmd.enabled !== false)
      .map(cmd => {
        let score = 0;
        const label = cmd.label.toLowerCase();
        const desc = (cmd.description || '').toLowerCase();
        const keywords = (cmd.keywords || []).join(' ').toLowerCase();

        // Exact match in label
        if (label === q) score += 100;
        // Starts with query in label
        else if (label.startsWith(q)) score += 50;
        // Contains query in label
        else if (label.includes(q)) score += 30;

        // Match in description
        if (desc.includes(q)) score += 20;

        // Match in keywords
        if (keywords.includes(q)) score += 10;

        // Match individual words
        const words = q.split(' ');
        words.forEach(word => {
          if (label.includes(word)) score += 5;
          if (desc.includes(word)) score += 3;
          if (keywords.includes(word)) score += 2;
        });

        return { cmd, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);
  }

  private updateResults(): void {
    if (this.resultsEl) {
      this.resultsEl.innerHTML = this.renderResults();
      this.scrollToSelected();
    }
  }

  private selectNext(): void {
    if (this.selectedIndex < this.filteredCommands.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
    }
  }

  private selectPrevious(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
    }
  }

  private updateSelection(): void {
    const items = this.resultsEl?.querySelectorAll('.command-palette__item');
    items?.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('command-palette__item--selected');
        item.setAttribute('aria-selected', 'true');
      } else {
        item.classList.remove('command-palette__item--selected');
        item.setAttribute('aria-selected', 'false');
      }
    });

    this.scrollToSelected();
  }

  private scrollToSelected(): void {
    const selectedEl = this.resultsEl?.querySelector('.command-palette__item--selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private async executeSelected(): Promise<void> {
    const command = this.filteredCommands[this.selectedIndex];
    if (!command) return;

    // Save to recent
    this.saveRecentCommand(command.id);

    // Close palette
    this.close();

    // Execute command
    try {
      await command.action();

      // Call onSelect callback
      if (this.config.onSelect) {
        this.config.onSelect(command);
      }
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }

  // Public methods

  public registerCommand(command: Command): void {
    // Remove existing if same ID
    this.commands = this.commands.filter(cmd => cmd.id !== command.id);
    this.commands.push(command);
  }

  public registerCommands(commands: Command[]): void {
    commands.forEach(cmd => this.registerCommand(cmd));
  }

  public unregisterCommand(commandId: string): void {
    this.commands = this.commands.filter(cmd => cmd.id !== commandId);
  }

  public open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    this.filteredCommands = this.commands.slice(0, this.config.maxResults!);
    this.selectedIndex = 0;

    this.render();

    // Trap focus
    document.body.style.overflow = 'hidden';

    // Call onOpen callback
    if (this.config.onOpen) {
      this.config.onOpen();
    }
  }

  public close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Remove from DOM
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    // Call onClose callback
    if (this.config.onClose) {
      this.config.onClose();
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public isActive(): boolean {
    return this.isOpen;
  }

  public destroy(): void {
    this.close();

    // Remove global listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
  }
}

// CSS for command palette (to be added to styles/components.css)
export const commandPaletteStyles = `
.command-palette-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.command-palette-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.command-palette {
  position: relative;
  width: 90vw;
  max-width: 600px;
  max-height: 70vh;
  background: var(--surface-0, #ffffff);
  border-radius: 12px;
  box-shadow: var(--elev-4, 0 12px 24px rgba(0, 0, 0, 0.12));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Search header */
.command-palette__header {
  border-bottom: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
}

.command-palette__search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.command-palette__input {
  flex: 1;
  border: none;
  background: none;
  font-size: 16px;
  font-family: inherit;
  color: var(--on-surface-high, #111827);
  outline: none;
}

.command-palette__shortcut {
  padding: 2px 6px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  background: var(--surface-1, #fafafa);
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
  border-radius: 4px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
}

/* Results */
.command-palette__results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.command-palette__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--on-surface-low, rgba(17, 24, 39, 0.55));
}

.command-palette__category {
  padding: 8px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Command items */
.command-palette__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms;
}

.command-palette__item:hover {
  background: var(--state-hover, rgba(0, 0, 0, 0.04));
}

.command-palette__item--selected {
  background: var(--state-selected, rgba(102, 126, 234, 0.14));
}

.command-palette__item-icon {
  font-size: 20px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
}

.command-palette__item-content {
  flex: 1;
  min-width: 0;
}

.command-palette__item-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface-high, #111827);
  display: flex;
  align-items: center;
  gap: 8px;
}

.command-palette__item-badge {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-700, #1d4ed8);
  border-radius: 4px;
}

.command-palette__item-description {
  font-size: 12px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-palette__item-shortcut {
  flex-shrink: 0;
  padding: 2px 6px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  background: var(--surface-1, #fafafa);
  border: 1px solid var(--border-subtle, rgba(0, 0, 0, 0.08));
  border-radius: 4px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
}

/* Dark mode */
[data-theme="dark"] .command-palette {
  background: var(--surface-1, #0b1220);
}

[data-theme="dark"] .command-palette-backdrop {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .command-palette__header {
  border-bottom-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
}

[data-theme="dark"] .command-palette__shortcut,
[data-theme="dark"] .command-palette__item-shortcut {
  background: var(--surface-2, #0f1b33);
  border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
}

[data-theme="dark"] .command-palette__item-badge {
  background: var(--color-primary-900, #1e3a8a);
  color: var(--color-primary-200, #bfdbfe);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.command-palette-backdrop {
  animation: fadeIn 200ms ease-out;
}

.command-palette {
  animation: slideDown 200ms ease-out;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .command-palette-backdrop,
  .command-palette {
    animation: none;
  }

  .command-palette__item {
    transition: none;
  }
}
`;