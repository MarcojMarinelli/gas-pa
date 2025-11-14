/**
 * Multi-layer Cache Manager with LRU eviction
 */

import { CacheEntry } from './types';
import ConfigManager from './config-manager';

interface LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
  timestamp: number;
  ttl?: number;
  hits: number;
}

class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, LRUNode<T>>;
  private head: LRUNode<T> | null;
  private tail: LRUNode<T> | null;

  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  get(key: string): T | null {
    const node = this.cache.get(key);

    if (!node) {
      return null;
    }

    // Check if expired
    if (node.ttl && Date.now() - node.timestamp > node.ttl * 1000) {
      this.remove(key);
      return null;
    }

    // Update hits and move to front
    node.hits++;
    this.moveToFront(node);

    return node.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.remove(key);
    }

    // Create new node
    const node: LRUNode<T> = {
      key,
      value,
      prev: null,
      next: null,
      timestamp: Date.now(),
      ttl,
      hits: 0
    };

    // Add to front
    this.addToFront(node);
    this.cache.set(key, node);

    // Evict if over capacity
    if (this.cache.size > this.capacity) {
      this.evictLRU();
    }
  }

  remove(key: string): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    // Remove from linked list
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.cache.delete(key);
    return true;
  }

  private moveToFront(node: LRUNode<T>): void {
    // Already at front
    if (node === this.head) {
      return;
    }

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    // Add to front
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private addToFront(node: LRUNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const key = this.tail.key;
    this.remove(key);
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; capacity: number; hitRate: number } {
    let totalHits = 0;
    let totalAccess = 0;

    this.cache.forEach(node => {
      totalHits += node.hits;
      totalAccess += node.hits + 1;
    });

    return {
      size: this.cache.size,
      capacity: this.capacity,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0
    };
  }
}

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: LRUCache<any>;
  private readonly PROPERTY_CACHE_PREFIX = 'CACHE_';
  private readonly MAX_PROPERTY_SIZE = 9000; // PropertiesService limit
  private readonly DEFAULT_TTL_SECONDS = 300; // 5 minutes
  private cacheStats: Map<string, { hits: number; misses: number }>;

  private constructor() {
    const capacity = ConfigManager.getWithDefault<number>('CACHE_CAPACITY', 100);
    this.memoryCache = new LRUCache(capacity);
    this.cacheStats = new Map();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(
    key: string,
    loader?: () => Promise<T>,
    options?: {
      ttl?: number;
      layer?: 'memory' | 'property' | 'sheet' | 'all';
      force?: boolean;
    }
  ): Promise<T | null> {
    const ttl = options?.ttl || this.DEFAULT_TTL_SECONDS;
    const layer = options?.layer || 'all';
    const force = options?.force || false;

    // Update stats
    this.updateStats(key, 'access');

    // Skip cache if forced
    if (force && loader) {
      const value = await loader();
      await this.set(key, value, ttl);
      return value;
    }

    // Layer 1: Memory cache
    if (layer === 'memory' || layer === 'all') {
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== null) {
        this.updateStats(key, 'hit');
        return memoryValue;
      }
    }

    // Layer 2: Properties Service
    if (layer === 'property' || layer === 'all') {
      const propertyValue = await this.getFromProperties<T>(key);
      if (propertyValue !== null) {
        // Promote to memory cache
        this.memoryCache.set(key, propertyValue, ttl);
        this.updateStats(key, 'hit');
        return propertyValue;
      }
    }

    // Layer 3: Google Sheets
    if (layer === 'sheet' || layer === 'all') {
      const sheetValue = await this.getFromSheet<T>(key);
      if (sheetValue !== null) {
        // Promote to upper layers
        this.memoryCache.set(key, sheetValue, ttl);
        await this.setToProperties(key, sheetValue, ttl);
        this.updateStats(key, 'hit');
        return sheetValue;
      }
    }

    // Cache miss - load if loader provided
    this.updateStats(key, 'miss');

    if (loader) {
      try {
        const value = await loader();
        await this.set(key, value, ttl);
        return value;
      } catch (error) {
        console.error(`Cache loader failed for key ${key}:`, error);
        return null;
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const ttlSeconds = ttl || this.DEFAULT_TTL_SECONDS;

    // Set in all layers
    this.memoryCache.set(key, value, ttlSeconds);
    await this.setToProperties(key, value, ttlSeconds);
    await this.setToSheet(key, value, ttlSeconds);
  }

  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidatedCount = 0;

    // Clear from memory cache
    const memoryKeys = Array.from(this.cacheStats.keys());
    memoryKeys.forEach(key => {
      if (this.matchesPattern(key, pattern)) {
        if (this.memoryCache.remove(key)) {
          invalidatedCount++;
        }
      }
    });

    // Clear from properties
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();

      Object.keys(allProperties).forEach(propKey => {
        if (propKey.startsWith(this.PROPERTY_CACHE_PREFIX)) {
          const cacheKey = propKey.substring(this.PROPERTY_CACHE_PREFIX.length);
          if (this.matchesPattern(cacheKey, pattern)) {
            properties.deleteProperty(propKey);
            invalidatedCount++;
          }
        }
      });
    } catch (error) {
      console.error('Failed to invalidate properties cache:', error);
    }

    // Clear from sheet
    await this.invalidateSheetCache(pattern);

    console.log(`Invalidated ${invalidatedCount} cache entries matching pattern`);
    return invalidatedCount;
  }

  async preWarm(keys: string[], loader: (key: string) => Promise<any>): Promise<void> {
    console.log(`Pre-warming cache with ${keys.length} keys`);

    const promises = keys.map(async key => {
      try {
        const value = await loader(key);
        await this.set(key, value);
      } catch (error) {
        console.error(`Failed to pre-warm key ${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Cache pre-warming complete');
  }

  private async getFromProperties<T>(key: string): Promise<T | null> {
    try {
      const properties = PropertiesService.getScriptProperties();
      const propertyKey = this.PROPERTY_CACHE_PREFIX + key;
      const data = properties.getProperty(propertyKey);

      if (!data) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(data);

      // Check expiration
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl * 1000) {
        properties.deleteProperty(propertyKey);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error(`Failed to get from properties cache: ${key}`, error);
      return null;
    }
  }

  private async setToProperties(key: string, value: any, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<any> = {
        value,
        timestamp: Date.now(),
        ttl,
        hits: 0
      };

      const serialized = JSON.stringify(entry);

      // Check size limit
      if (serialized.length > this.MAX_PROPERTY_SIZE) {
        console.warn(`Cache value too large for properties: ${key} (${serialized.length} bytes)`);
        return;
      }

      const properties = PropertiesService.getScriptProperties();
      const propertyKey = this.PROPERTY_CACHE_PREFIX + key;
      properties.setProperty(propertyKey, serialized);
    } catch (error) {
      console.error(`Failed to set properties cache: ${key}`, error);
    }
  }

  private async getFromSheet<T>(key: string): Promise<T | null> {
    try {
      const spreadsheetId = ConfigManager.get<string>('MAIN_SPREADSHEET_ID');
      if (!spreadsheetId) {
        return null;
      }

      const sheet = SpreadsheetApp.openById(spreadsheetId)
        .getSheetByName('Cache');

      if (!sheet) {
        return null;
      }

      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === key) {
          const timestamp = new Date(row[1]).getTime();
          const ttl = row[2];

          // Check expiration
          if (ttl && Date.now() - timestamp > ttl * 1000) {
            // Delete expired row
            sheet.deleteRow(i + 1);
            return null;
          }

          return JSON.parse(row[3]);
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to get from sheet cache: ${key}`, error);
      return null;
    }
  }

  private async setToSheet(key: string, value: any, ttl: number): Promise<void> {
    try {
      const spreadsheetId = ConfigManager.get<string>('MAIN_SPREADSHEET_ID');
      if (!spreadsheetId) {
        return;
      }

      let sheet = SpreadsheetApp.openById(spreadsheetId)
        .getSheetByName('Cache');

      if (!sheet) {
        sheet = SpreadsheetApp.openById(spreadsheetId)
          .insertSheet('Cache');

        // Add headers
        sheet.appendRow(['Key', 'Timestamp', 'TTL', 'Value']);
      }

      // Find existing row or add new
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          rowIndex = i + 1;
          break;
        }
      }

      const row = [key, new Date(), ttl, JSON.stringify(value)];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([row]);
      } else {
        sheet.appendRow(row);
      }
    } catch (error) {
      console.error(`Failed to set sheet cache: ${key}`, error);
    }
  }

  private async invalidateSheetCache(pattern: string | RegExp): Promise<void> {
    try {
      const spreadsheetId = ConfigManager.get<string>('MAIN_SPREADSHEET_ID');
      if (!spreadsheetId) {
        return;
      }

      const sheet = SpreadsheetApp.openById(spreadsheetId)
        .getSheetByName('Cache');

      if (!sheet) {
        return;
      }

      const data = sheet.getDataRange().getValues();
      const rowsToDelete: number[] = [];

      for (let i = 1; i < data.length; i++) {
        if (this.matchesPattern(data[i][0], pattern)) {
          rowsToDelete.push(i + 1);
        }
      }

      // Delete rows in reverse order
      rowsToDelete.reverse().forEach(row => {
        sheet.deleteRow(row);
      });
    } catch (error) {
      console.error('Failed to invalidate sheet cache:', error);
    }
  }

  private matchesPattern(key: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return key.includes(pattern);
    } else {
      return pattern.test(key);
    }
  }

  private updateStats(key: string, type: 'hit' | 'miss' | 'access'): void {
    if (!this.cacheStats.has(key)) {
      this.cacheStats.set(key, { hits: 0, misses: 0 });
    }

    const stats = this.cacheStats.get(key)!;

    if (type === 'hit') {
      stats.hits++;
    } else if (type === 'miss') {
      stats.misses++;
    }
  }

  getStatistics(): {
    memory: any;
    overall: { totalKeys: number; avgHitRate: number };
  } {
    const memoryStats = this.memoryCache.getStats();

    let totalHits = 0;
    let totalMisses = 0;

    this.cacheStats.forEach(stats => {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    });

    const hitRate = (totalHits + totalMisses) > 0
      ? totalHits / (totalHits + totalMisses)
      : 0;

    return {
      memory: memoryStats,
      overall: {
        totalKeys: this.cacheStats.size,
        avgHitRate: hitRate
      }
    };
  }

  clear(): void {
    this.memoryCache.clear();
    this.cacheStats.clear();

    // Clear properties
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();

      Object.keys(allProperties).forEach(key => {
        if (key.startsWith(this.PROPERTY_CACHE_PREFIX)) {
          properties.deleteProperty(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear properties cache:', error);
    }

    console.log('Cache cleared');
  }
}

// Export singleton instance
export default CacheManager.getInstance();