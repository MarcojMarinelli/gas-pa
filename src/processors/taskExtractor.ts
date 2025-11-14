import Logger from '../core/logger';
import { EmailData } from '../types';

interface Task {
  id: string;
  emailId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  source: string;
}

/**
 * Extracts and manages tasks from emails
 */
export class TaskExtractor {
  private tasks: Task[] = [];
  private readonly taskPatterns = [
    /(?:TODO|TASK|ACTION):\s*(.+)/gi,
    /(?:Please|Could you|Can you|Would you)\s+(.+\?)/gi,
    /(?:Need to|Should|Must|Have to)\s+(.+)/gi,
    /\[\s*\]\s*(.+)/g, // Checkbox format
    /^\d+\.\s*(.+)/gm, // Numbered list
    /^[-*]\s*(.+)/gm, // Bullet points
  ];

  constructor() {
    this.loadTasks();
  }

  /**
   * Extract tasks from email content
   */
  extractTasks(email: EmailData): Task[] {
    Logger.info('TaskExtractor', `Extracting tasks from email: ${email.id}`);

    const extractedTasks: Task[] = [];
    const content = `${email.subject}\n${email.body}`;

    // Apply each pattern to find tasks
    for (const pattern of this.taskPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const taskText = match[1]?.trim();
        if (taskText && taskText.length > 10 && taskText.length < 500) {
          const task: Task = {
            id: Utilities.getUuid(),
            emailId: email.id,
            title: this.cleanTaskText(taskText),
            priority: this.determinePriority(taskText),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: email.from,
            dueDate: this.extractDueDate(taskText)
          };

          extractedTasks.push(task);
        }
      }
    }

    // Deduplicate similar tasks
    const uniqueTasks = this.deduplicateTasks(extractedTasks);

    // Add to tasks collection
    this.tasks.push(...uniqueTasks);
    this.saveTasks();

    Logger.info('TaskExtractor', `Extracted ${uniqueTasks.length} tasks`);
    return uniqueTasks;
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Task[] {
    return this.tasks.filter(task =>
      task.status === 'pending' || task.status === 'in_progress'
    ).sort((a, b) => {
      // Sort by priority and due date
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: Task['status']): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      this.saveTasks();
      Logger.info('TaskExtractor', `Updated task ${taskId} status to ${status}`);
      return true;
    }
    return false;
  }

  /**
   * Clean extracted task text
   */
  private cleanTaskText(text: string): string {
    return text
      .replace(/^[-*\d.)\]]\s*/g, '') // Remove list markers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[.!?]+$/, '') // Remove ending punctuation
      .trim();
  }

  /**
   * Determine task priority based on keywords
   */
  private determinePriority(text: string): Task['priority'] {
    const lowercaseText = text.toLowerCase();

    const highPriorityKeywords = ['urgent', 'asap', 'critical', 'immediately', 'today', 'emergency'];
    const mediumPriorityKeywords = ['important', 'soon', 'tomorrow', 'this week', 'priority'];

    if (highPriorityKeywords.some(keyword => lowercaseText.includes(keyword))) {
      return 'high';
    }

    if (mediumPriorityKeywords.some(keyword => lowercaseText.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract due date from task text
   */
  private extractDueDate(text: string): Date | undefined {
    const today = new Date();
    const lowercaseText = text.toLowerCase();

    // Check for relative dates
    if (lowercaseText.includes('today')) {
      return today;
    }

    if (lowercaseText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    // Check for day names
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (lowercaseText.includes(dayNames[i])) {
        const targetDay = i === 0 ? 1 : i; // Monday is 1 in JS
        const currentDay = today.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7; // If same day, assume next week
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysUntil);
        return targetDate;
      }
    }

    // Check for explicit dates (MM/DD, DD/MM patterns)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        if (month <= 12 && day <= 31) {
          const date = new Date(today.getFullYear(), month - 1, day);
          if (date < today) {
            date.setFullYear(date.getFullYear() + 1);
          }
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Deduplicate similar tasks
   */
  private deduplicateTasks(tasks: Task[]): Task[] {
    const uniqueTasks: Task[] = [];
    const seenTitles = new Set<string>();

    for (const task of tasks) {
      const normalizedTitle = task.title.toLowerCase().replace(/\s+/g, ' ');
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueTasks.push(task);
      }
    }

    return uniqueTasks;
  }

  /**
   * Load tasks from storage
   */
  private loadTasks(): void {
    try {
      const stored = PropertiesService.getScriptProperties()
        .getProperty('EXTRACTED_TASKS');

      if (stored) {
        this.tasks = JSON.parse(stored).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined
        }));
      }
    } catch (error) {
      Logger.error('TaskExtractor', 'Failed to load tasks', error);
      this.tasks = [];
    }
  }

  /**
   * Save tasks to storage
   */
  private saveTasks(): void {
    try {
      // Keep only last 500 tasks
      if (this.tasks.length > 500) {
        this.tasks = this.tasks.slice(-500);
      }

      PropertiesService.getScriptProperties()
        .setProperty('EXTRACTED_TASKS', JSON.stringify(this.tasks));
    } catch (error) {
      Logger.error('TaskExtractor', 'Failed to save tasks', error);
    }
  }

  /**
   * Get task statistics
   */
  getTaskStats(): Record<string, number> {
    const stats = {
      total: this.tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      highPriority: 0,
      dueToday: 0,
      overdue: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of this.tasks) {
      stats[task.status === 'in_progress' ? 'inProgress' : task.status]++;

      if (task.priority === 'high' && task.status === 'pending') {
        stats.highPriority++;
      }

      if (task.dueDate && task.status === 'pending') {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === today.getTime()) {
          stats.dueToday++;
        } else if (dueDate < today) {
          stats.overdue++;
        }
      }
    }

    return stats;
  }
}