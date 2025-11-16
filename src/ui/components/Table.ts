/**
 * Table Component with Virtual Scrolling and Sticky Features
 * Supports ≥200 rows with smooth performance
 * Implements sticky header and first column per spec
 */

export interface TableColumn<T = any> {
  id: string;
  header: string;
  width?: string;
  sticky?: boolean;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => string | HTMLElement;
  accessor?: (row: T) => any;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  id: string;
  data: Record<string, any>;
  selected?: boolean;
  disabled?: boolean;
  actions?: TableAction[];
}

export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  handler: (row: TableRow) => void | Promise<void>;
  condition?: (row: TableRow) => boolean;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: string;
  handler: (selectedRows: TableRow[]) => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface TableConfig {
  columns: TableColumn[];
  rows: TableRow[];
  height?: number; // Fixed height for virtualization
  rowHeight?: number; // Will be auto-determined from density
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  bulkActions?: BulkAction[];
  emptyMessage?: string;
  loading?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: TableRow, event: MouseEvent) => void;
  onSelectionChange?: (selectedRows: TableRow[]) => void;
  virtualScrollBuffer?: number; // Number of rows to render outside viewport
  keyboardNavigation?: boolean;
  ariaLabel?: string;
}

export class Table {
  private container: HTMLElement;
  private config: TableConfig;
  private tableEl: HTMLElement;
  private headerEl: HTMLElement;
  private bodyEl: HTMLElement;
  private bulkBarEl?: HTMLElement;
  private scrollContainer: HTMLElement;

  // Virtualization state
  private visibleStartIndex = 0;
  private visibleEndIndex = 0;
  private scrollTop = 0;
  private containerHeight = 0;
  private actualRowHeight = 48; // Default, will be calculated

  // Selection state
  private selectedRowIds = new Set<string>();
  private lastSelectedIndex = -1;

  // Focus management
  private focusedRowIndex = -1;
  private focusedCellIndex = -1;

  // Performance optimization
  private renderFrame?: number;
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement | string, config: TableConfig) {
    this.container = typeof container === 'string'
      ? document.querySelector<HTMLElement>(container)!
      : container;

    if (!this.container) {
      throw new Error('Table container not found');
    }

    this.config = {
      stickyHeader: true,
      stickyFirstColumn: false,
      selectable: false,
      multiSelect: false,
      virtualScrollBuffer: 5,
      keyboardNavigation: true,
      emptyMessage: 'No data available',
      ...config
    };

    this.scrollContainer = this.container;
    this.tableEl = document.createElement('table');
    this.headerEl = document.createElement('thead');
    this.bodyEl = document.createElement('tbody');

    this.init();
  }

  private init(): void {
    // Clear container
    this.container.innerHTML = '';
    this.container.classList.add('table-container');

    // Set ARIA attributes
    if (this.config.ariaLabel) {
      this.tableEl.setAttribute('aria-label', this.config.ariaLabel);
    }
    this.tableEl.setAttribute('role', 'table');

    // Add table classes
    this.tableEl.classList.add('table');
    if (this.config.stickyHeader) {
      this.tableEl.classList.add('table-header-sticky');
    }
    if (this.config.stickyFirstColumn) {
      this.tableEl.classList.add('table-column-sticky');
    }

    // Calculate row height based on density
    this.calculateRowHeight();

    // Setup structure
    this.tableEl.appendChild(this.headerEl);
    this.tableEl.appendChild(this.bodyEl);

    // Wrap in scroll container if height is fixed (virtualization)
    if (this.config.height) {
      this.scrollContainer = document.createElement('div');
      this.scrollContainer.className = 'table-scroll-container';
      this.scrollContainer.style.height = `${this.config.height}px`;
      this.scrollContainer.style.overflowY = 'auto';
      this.scrollContainer.style.position = 'relative';
      this.scrollContainer.appendChild(this.tableEl);
      this.container.appendChild(this.scrollContainer);

      // Setup virtualization
      this.setupVirtualization();
    } else {
      this.container.appendChild(this.tableEl);
    }

    // Create bulk action bar if needed
    if (this.config.bulkActions && this.config.bulkActions.length > 0) {
      this.createBulkBar();
    }

    // Initial render
    this.render();

    // Setup event listeners
    this.setupEventListeners();

    // Setup resize observer
    this.setupResizeObserver();
  }

  private calculateRowHeight(): void {
    const density = document.documentElement.getAttribute('data-density') || 'comfortable';
    this.actualRowHeight = density === 'compact' ? 40 : 48;

    // Override if explicitly set
    if (this.config.rowHeight) {
      this.actualRowHeight = this.config.rowHeight;
    }
  }

  private setupVirtualization(): void {
    if (!this.config.height) return;

    this.containerHeight = this.config.height;
    this.calculateVisibleRange();
  }

  private calculateVisibleRange(): void {
    const buffer = this.config.virtualScrollBuffer || 5;
    const totalRows = this.config.rows.length;
    const visibleRows = Math.ceil(this.containerHeight / this.actualRowHeight);

    this.visibleStartIndex = Math.max(0,
      Math.floor(this.scrollTop / this.actualRowHeight) - buffer);
    this.visibleEndIndex = Math.min(totalRows,
      this.visibleStartIndex + visibleRows + buffer * 2);
  }

  private setupEventListeners(): void {
    // Scroll listener for virtualization
    if (this.config.height) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
    }

    // Click listeners
    this.tableEl.addEventListener('click', this.handleTableClick.bind(this));

    // Keyboard navigation
    if (this.config.keyboardNavigation) {
      this.tableEl.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.tableEl.tabIndex = 0;
    }

    // Sort listeners
    if (this.config.onSort) {
      this.headerEl.addEventListener('click', this.handleHeaderClick.bind(this));
    }
  }

  private setupResizeObserver(): void {
    if (!this.config.height) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (Math.abs(newHeight - this.containerHeight) > 1) {
          this.containerHeight = newHeight;
          this.calculateVisibleRange();
          this.renderBody();
        }
      }
    });

    this.resizeObserver.observe(this.scrollContainer);
  }

  private handleScroll(): void {
    if (this.renderFrame) {
      cancelAnimationFrame(this.renderFrame);
    }

    this.renderFrame = requestAnimationFrame(() => {
      this.scrollTop = this.scrollContainer.scrollTop;
      this.calculateVisibleRange();
      this.renderBody();
    });
  }

  private handleTableClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Handle row selection
    if (this.config.selectable) {
      const checkbox = target.closest('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        const row = checkbox.closest('tr');
        if (row) {
          const rowId = row.dataset.rowId;
          if (rowId) {
            this.toggleRowSelection(rowId, checkbox.checked, event.shiftKey);
            event.stopPropagation();
            return;
          }
        }
      }
    }

    // Handle row click
    const row = target.closest('tr');
    if (row && row.parentElement === this.bodyEl) {
      const rowId = row.dataset.rowId;
      if (rowId) {
        const tableRow = this.config.rows.find(r => r.id === rowId);
        if (tableRow && this.config.onRowClick) {
          this.config.onRowClick(tableRow, event);
        }
      }
    }

    // Handle row actions
    const actionBtn = target.closest('[data-action]') as HTMLElement;
    if (actionBtn) {
      const actionId = actionBtn.dataset.action;
      const row = actionBtn.closest('tr');
      if (row && actionId) {
        const rowId = row.dataset.rowId;
        const tableRow = this.config.rows.find(r => r.id === rowId);
        const action = tableRow?.actions?.find(a => a.id === actionId);
        if (action && tableRow) {
          action.handler(tableRow);
          event.stopPropagation();
        }
      }
    }
  }

  private handleHeaderClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const th = target.closest('th');

    if (th && th.dataset.sortable === 'true') {
      const columnId = th.dataset.columnId;
      if (columnId && this.config.onSort) {
        const currentDir = this.config.sortDirection || 'asc';
        const newDir = this.config.sortColumn === columnId && currentDir === 'asc'
          ? 'desc'
          : 'asc';

        this.config.sortColumn = columnId;
        this.config.sortDirection = newDir;
        this.config.onSort(columnId, newDir);
        this.renderHeader(); // Update sort indicators
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const rows = Array.from(this.bodyEl.querySelectorAll('tr'));
    const currentRow = rows[this.focusedRowIndex];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusRow(Math.min(this.focusedRowIndex + 1, rows.length - 1));
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.focusRow(Math.max(this.focusedRowIndex - 1, 0));
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (currentRow) {
          const cells = Array.from(currentRow.querySelectorAll('td'));
          this.focusedCellIndex = Math.max(this.focusedCellIndex - 1, 0);
          cells[this.focusedCellIndex]?.focus();
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (currentRow) {
          const cells = Array.from(currentRow.querySelectorAll('td'));
          this.focusedCellIndex = Math.min(this.focusedCellIndex + 1, cells.length - 1);
          cells[this.focusedCellIndex]?.focus();
        }
        break;

      case 'Enter':
      case ' ':
        if (this.config.selectable && currentRow) {
          event.preventDefault();
          const checkbox = currentRow.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            const rowId = currentRow.dataset.rowId;
            if (rowId) {
              this.toggleRowSelection(rowId, checkbox.checked, event.shiftKey);
            }
          }
        }
        break;

      case 'Home':
        event.preventDefault();
        this.focusRow(0);
        break;

      case 'End':
        event.preventDefault();
        this.focusRow(rows.length - 1);
        break;
    }
  }

  private focusRow(index: number): void {
    const rows = Array.from(this.bodyEl.querySelectorAll('tr'));
    if (index >= 0 && index < rows.length) {
      this.focusedRowIndex = index;
      rows[index].focus();
      rows[index].scrollIntoView({ block: 'nearest' });
    }
  }

  private toggleRowSelection(rowId: string, selected: boolean, shiftKey: boolean): void {
    const rowIndex = this.config.rows.findIndex(r => r.id === rowId);

    if (!this.config.multiSelect) {
      // Single selection mode
      this.selectedRowIds.clear();
      if (selected) {
        this.selectedRowIds.add(rowId);
      }
    } else if (shiftKey && this.lastSelectedIndex >= 0) {
      // Range selection
      const start = Math.min(this.lastSelectedIndex, rowIndex);
      const end = Math.max(this.lastSelectedIndex, rowIndex);

      for (let i = start; i <= end; i++) {
        const row = this.config.rows[i];
        if (!row.disabled) {
          if (selected) {
            this.selectedRowIds.add(row.id);
          } else {
            this.selectedRowIds.delete(row.id);
          }
        }
      }
    } else {
      // Toggle individual selection
      if (selected) {
        this.selectedRowIds.add(rowId);
      } else {
        this.selectedRowIds.delete(rowId);
      }
    }

    this.lastSelectedIndex = rowIndex;

    // Update row state
    this.config.rows.forEach(row => {
      row.selected = this.selectedRowIds.has(row.id);
    });

    // Update UI
    this.renderBody();
    this.updateBulkBar();
    this.updateSelectAllCheckbox();

    // Notify listener
    if (this.config.onSelectionChange) {
      const selectedRows = this.config.rows.filter(r => this.selectedRowIds.has(r.id));
      this.config.onSelectionChange(selectedRows);
    }
  }

  private render(): void {
    this.renderHeader();
    this.renderBody();
  }

  private renderHeader(): void {
    this.headerEl.innerHTML = '';

    const headerRow = document.createElement('tr');

    // Selection column
    if (this.config.selectable) {
      const th = document.createElement('th');
      th.className = 'table-selection-cell';

      if (this.config.multiSelect) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        checkbox.checked = this.selectedRowIds.size === this.config.rows.length &&
          this.config.rows.length > 0;
        checkbox.indeterminate = this.selectedRowIds.size > 0 &&
          this.selectedRowIds.size < this.config.rows.length;
        checkbox.addEventListener('change', () => {
          this.toggleAllSelection(checkbox.checked);
        });
        checkbox.setAttribute('aria-label', 'Select all rows');
        th.appendChild(checkbox);
      }

      headerRow.appendChild(th);
    }

    // Data columns
    this.config.columns.forEach((column, index) => {
      const th = document.createElement('th');
      th.dataset.columnId = column.id;

      if (column.sticky && index === 0) {
        th.classList.add('table-sticky-column');
      }

      if (column.width) {
        th.style.width = column.width;
      }

      if (column.align) {
        th.style.textAlign = column.align;
      }

      // Column header content
      const headerContent = document.createElement('div');
      headerContent.className = 'table-header-content';

      const headerLabel = document.createElement('span');
      headerLabel.textContent = column.header;
      headerContent.appendChild(headerLabel);

      // Sort indicator
      if (column.sortable) {
        th.dataset.sortable = 'true';
        th.style.cursor = 'pointer';
        th.setAttribute('aria-sort', 'none');

        if (this.config.sortColumn === column.id) {
          const sortIcon = document.createElement('span');
          sortIcon.className = 'table-sort-icon';
          sortIcon.textContent = this.config.sortDirection === 'asc' ? '↑' : '↓';
          headerContent.appendChild(sortIcon);
          th.setAttribute('aria-sort', this.config.sortDirection === 'asc'
            ? 'ascending'
            : 'descending');
        }
      }

      th.appendChild(headerContent);
      headerRow.appendChild(th);
    });

    // Actions column
    if (this.hasRowActions()) {
      const th = document.createElement('th');
      th.className = 'table-actions-cell';
      th.innerHTML = '<span class="sr-only">Actions</span>';
      headerRow.appendChild(th);
    }

    this.headerEl.appendChild(headerRow);
  }

  private renderBody(): void {
    // Clear existing content
    this.bodyEl.innerHTML = '';

    if (this.config.loading) {
      this.renderLoadingState();
      return;
    }

    if (this.config.rows.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Virtual scrolling logic
    let rowsToRender = this.config.rows;
    let startOffset = 0;
    let endOffset = 0;

    if (this.config.height) {
      // Calculate spacers for virtual scrolling
      startOffset = this.visibleStartIndex * this.actualRowHeight;
      endOffset = (this.config.rows.length - this.visibleEndIndex) * this.actualRowHeight;
      rowsToRender = this.config.rows.slice(this.visibleStartIndex, this.visibleEndIndex);

      // Add spacer at the top
      if (startOffset > 0) {
        const spacer = document.createElement('tr');
        spacer.style.height = `${startOffset}px`;
        spacer.className = 'table-virtual-spacer';
        this.bodyEl.appendChild(spacer);
      }
    }

    // Render visible rows
    rowsToRender.forEach((row, index) => {
      const actualIndex = this.config.height ? this.visibleStartIndex + index : index;
      this.renderRow(row, actualIndex);
    });

    // Add spacer at the bottom
    if (this.config.height && endOffset > 0) {
      const spacer = document.createElement('tr');
      spacer.style.height = `${endOffset}px`;
      spacer.className = 'table-virtual-spacer';
      this.bodyEl.appendChild(spacer);
    }
  }

  private renderRow(row: TableRow, index: number): void {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;
    tr.style.height = `${this.actualRowHeight}px`;

    if (row.selected) {
      tr.classList.add('table-row-selected');
    }

    if (row.disabled) {
      tr.classList.add('table-row-disabled');
      tr.setAttribute('aria-disabled', 'true');
    }

    if (this.config.keyboardNavigation) {
      tr.tabIndex = -1;
      tr.setAttribute('role', 'row');
    }

    // Selection cell
    if (this.config.selectable) {
      const td = document.createElement('td');
      td.className = 'table-selection-cell';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox';
      checkbox.checked = row.selected || false;
      checkbox.disabled = row.disabled || false;
      checkbox.setAttribute('aria-label', `Select row ${index + 1}`);

      td.appendChild(checkbox);
      tr.appendChild(td);
    }

    // Data cells
    this.config.columns.forEach((column, colIndex) => {
      const td = document.createElement('td');

      if (column.sticky && colIndex === 0) {
        td.classList.add('table-sticky-column');
      }

      if (column.align) {
        td.style.textAlign = column.align;
      }

      // Get cell value for display (accessor is for sorting only)
      let value = row.data[column.id];

      // Render cell content
      if (column.render) {
        const rendered = column.render(value, row, index);
        if (typeof rendered === 'string') {
          td.innerHTML = rendered;
        } else {
          td.appendChild(rendered);
        }
      } else {
        td.textContent = value?.toString() || '';
      }

      tr.appendChild(td);
    });

    // Actions cell
    if (this.hasRowActions()) {
      const td = document.createElement('td');
      td.className = 'table-actions-cell';

      if (row.actions && row.actions.length > 0) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'table-row-actions';

        row.actions.forEach(action => {
          if (!action.condition || action.condition(row)) {
            const btn = document.createElement('button');
            btn.className = 'button button--text button--small';
            btn.dataset.action = action.id;
            btn.setAttribute('aria-label', action.label);

            if (action.icon) {
              btn.innerHTML = action.icon;
            } else {
              btn.textContent = action.label;
            }

            actionsContainer.appendChild(btn);
          }
        });

        td.appendChild(actionsContainer);
      }

      tr.appendChild(td);
    }

    this.bodyEl.appendChild(tr);
  }

  private renderLoadingState(): void {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = this.getColumnCount();
    td.className = 'table-state-cell';

    const spinner = document.createElement('div');
    spinner.className = 'spinner spinner--medium';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading data');

    td.appendChild(spinner);
    tr.appendChild(td);
    this.bodyEl.appendChild(tr);
  }

  private renderEmptyState(): void {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = this.getColumnCount();
    td.className = 'table-state-cell';

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-secondary';
    emptyMessage.textContent = this.config.emptyMessage || 'No data available';

    td.appendChild(emptyMessage);
    tr.appendChild(td);
    this.bodyEl.appendChild(tr);
  }

  private createBulkBar(): void {
    this.bulkBarEl = document.createElement('div');
    this.bulkBarEl.className = 'bulk-action-bar';
    this.bulkBarEl.setAttribute('role', 'toolbar');
    this.bulkBarEl.setAttribute('aria-label', 'Bulk actions');

    // Selection info
    const selectionInfo = document.createElement('div');
    selectionInfo.className = 'bulk-action-info';

    const selectedCount = document.createElement('span');
    selectedCount.className = 'bulk-action-count';
    selectionInfo.appendChild(selectedCount);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'button button--text button--small';
    clearBtn.textContent = 'Clear selection';
    clearBtn.addEventListener('click', () => this.clearSelection());
    selectionInfo.appendChild(clearBtn);

    this.bulkBarEl.appendChild(selectionInfo);

    // Action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'bulk-action-buttons';

    this.config.bulkActions?.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `button button--${action.variant || 'secondary'}`;

      if (action.icon) {
        btn.innerHTML = `${action.icon} <span>${action.label}</span>`;
      } else {
        btn.textContent = action.label;
      }

      btn.addEventListener('click', () => {
        const selectedRows = this.config.rows.filter(r => this.selectedRowIds.has(r.id));
        action.handler(selectedRows);
      });

      actionsContainer.appendChild(btn);
    });

    this.bulkBarEl.appendChild(actionsContainer);
    this.container.appendChild(this.bulkBarEl);

    // Initially hidden
    this.bulkBarEl.style.display = 'none';
  }

  private updateBulkBar(): void {
    if (!this.bulkBarEl) return;

    const selectedCount = this.selectedRowIds.size;

    if (selectedCount > 0) {
      this.bulkBarEl.style.display = 'flex';
      const countEl = this.bulkBarEl.querySelector('.bulk-action-count');
      if (countEl) {
        countEl.textContent = `${selectedCount} item${selectedCount > 1 ? 's' : ''} selected`;
      }
    } else {
      this.bulkBarEl.style.display = 'none';
    }
  }

  private updateSelectAllCheckbox(): void {
    if (!this.config.selectable || !this.config.multiSelect) return;

    const checkbox = this.headerEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (!checkbox) return;

    const allSelected = this.selectedRowIds.size === this.config.rows.length &&
      this.config.rows.length > 0;
    const someSelected = this.selectedRowIds.size > 0 &&
      this.selectedRowIds.size < this.config.rows.length;

    checkbox.checked = allSelected;
    checkbox.indeterminate = someSelected;
  }

  private toggleAllSelection(selected: boolean): void {
    if (selected) {
      this.config.rows.forEach(row => {
        if (!row.disabled) {
          this.selectedRowIds.add(row.id);
          row.selected = true;
        }
      });
    } else {
      this.selectedRowIds.clear();
      this.config.rows.forEach(row => {
        row.selected = false;
      });
    }

    this.renderBody();
    this.updateBulkBar();
    this.updateSelectAllCheckbox();

    if (this.config.onSelectionChange) {
      const selectedRows = this.config.rows.filter(r => this.selectedRowIds.has(r.id));
      this.config.onSelectionChange(selectedRows);
    }
  }

  private clearSelection(): void {
    this.selectedRowIds.clear();
    this.config.rows.forEach(row => {
      row.selected = false;
    });
    this.renderBody();
    this.updateBulkBar();

    if (this.config.onSelectionChange) {
      this.config.onSelectionChange([]);
    }
  }

  private hasRowActions(): boolean {
    return this.config.rows.some(row => row.actions && row.actions.length > 0);
  }

  private getColumnCount(): number {
    let count = this.config.columns.length;
    if (this.config.selectable) count++;
    if (this.hasRowActions()) count++;
    return count;
  }

  // Public API methods

  public update(config: Partial<TableConfig>): void {
    this.config = { ...this.config, ...config };
    this.calculateRowHeight();
    this.render();
    this.updateBulkBar();
  }

  public setRows(rows: TableRow[]): void {
    this.config.rows = rows;
    this.calculateVisibleRange();
    this.renderBody();
  }

  public getSelectedRows(): TableRow[] {
    return this.config.rows.filter(row => this.selectedRowIds.has(row.id));
  }

  public selectRows(rowIds: string[]): void {
    this.selectedRowIds.clear();
    rowIds.forEach(id => {
      const row = this.config.rows.find(r => r.id === id);
      if (row && !row.disabled) {
        this.selectedRowIds.add(id);
        row.selected = true;
      }
    });
    this.renderBody();
    this.updateBulkBar();
  }

  public sort(columnId: string, direction: 'asc' | 'desc'): void {
    this.config.sortColumn = columnId;
    this.config.sortDirection = direction;

    const column = this.config.columns.find(c => c.id === columnId);
    if (!column) return;

    this.config.rows.sort((a, b) => {
      const aVal = column.accessor ? column.accessor(a) : a.data[columnId];
      const bVal = column.accessor ? column.accessor(b) : b.data[columnId];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });

    this.render();
  }

  public setLoading(loading: boolean): void {
    this.config.loading = loading;
    this.renderBody();
  }

  public scrollToRow(rowId: string): void {
    const rowIndex = this.config.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;

    const scrollTop = rowIndex * this.actualRowHeight;

    if (this.config.height) {
      this.scrollContainer.scrollTop = scrollTop;
    } else {
      const row = this.bodyEl.querySelector(`tr[data-row-id="${rowId}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  public destroy(): void {
    // Clean up event listeners
    if (this.renderFrame) {
      cancelAnimationFrame(this.renderFrame);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clear container
    this.container.innerHTML = '';
    this.container.classList.remove('table-container');
  }
}

// Export factory function for easier instantiation
export function createTable(container: HTMLElement | string, config: TableConfig): Table {
  return new Table(container, config);
}