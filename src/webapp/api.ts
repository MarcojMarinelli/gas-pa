import Logger from '../core/logger';
import Config from '../core/config';
import AuthManager from '../core/auth';
import { EmailProcessor } from '../processors/emailProcessor';
import { TaskExtractor } from '../processors/taskExtractor';
import { Scheduler } from '../processors/scheduler';
import { GmailService } from '../services/gmail';

/**
 * Handle GET requests to the web app
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput | GoogleAppsScript.Content.TextOutput {
  Logger.info('WebApp', `GET request received: ${JSON.stringify(e.parameter)}`);
  
  const path = e.parameter.path || 'index';
  const format = e.parameter.format || 'html';
  
  try {
    switch (path) {
      case 'index':
        return serveIndexPage();
        
      case 'api/status':
        return serveJson(getSystemStatus());
        
      case 'api/config':
        return serveJson(getConfiguration());
        
      case 'api/tasks':
        return serveJson(getTasks());
        
      case 'api/schedule':
        return serveJson(getSchedule());
        
      default:
        return serve404();
    }
  } catch (error) {
    Logger.error('WebApp', 'Failed to handle GET request', error);
    return serveError(error);
  }
}

/**
 * Handle POST requests to the web app
 */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  Logger.info('WebApp', 'POST request received');
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // Check authentication
    if (!isAuthenticated(e)) {
      return serveJson({ error: 'Unauthorized' }, 401);
    }
    
    switch (action) {
      case 'processEmails':
        return serveJson(processEmailsManually(data));
        
      case 'updateConfig':
        return serveJson(updateConfiguration(data));
        
      case 'updateTask':
        return serveJson(updateTask(data));
        
      case 'runJob':
        return serveJson(runScheduledJob(data));
        
      default:
        return serveJson({ error: 'Unknown action' }, 400);
    }
    
  } catch (error) {
    Logger.error('WebApp', 'Failed to handle POST request', error);
    return serveError(error);
  }
}

/**
 * Serve the index HTML page
 */
function serveIndexPage(): GoogleAppsScript.HTML.HtmlOutput {
  const template = `
<!DOCTYPE html>
<html>
<head>
  <title>GAS Personal Assistant</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .card h2 {
      color: #764ba2;
      margin-bottom: 15px;
      font-size: 1.2em;
    }
    .stat {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .stat:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #666;
    }
    .stat-value {
      font-weight: bold;
      color: #333;
    }
    .button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 15px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .status-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .status-active { background: #10b981; }
    .status-inactive { background: #ef4444; }
    .status-warning { background: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 GAS Personal Assistant</h1>
      <p class="subtitle">Email Processing & Automation Dashboard</p>
    </div>
    
    <div class="grid">
      <div class="card">
        <h2>📊 System Status</h2>
        <div id="status-content">
          <div class="stat">
            <span class="stat-label">Status</span>
            <span class="stat-value"><span class="status-dot status-active"></span>Active</span>
          </div>
          <div class="stat">
            <span class="stat-label">Version</span>
            <span class="stat-value">1.0.0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Environment</span>
            <span class="stat-value">Production</span>
          </div>
        </div>
        <button class="button" onclick="refreshStatus()">Refresh Status</button>
      </div>
      
      <div class="card">
        <h2>✉️ Email Processing</h2>
        <div id="email-content">
          <div class="stat">
            <span class="stat-label">Processed Today</span>
            <span class="stat-value" id="emails-today">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">Pending</span>
            <span class="stat-value" id="emails-pending">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">Last Run</span>
            <span class="stat-value" id="last-run">-</span>
          </div>
        </div>
        <button class="button" onclick="processEmails()">Process Now</button>
      </div>
      
      <div class="card">
        <h2>📝 Tasks</h2>
        <div id="tasks-content">
          <div class="stat">
            <span class="stat-label">Pending</span>
            <span class="stat-value" id="tasks-pending">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">High Priority</span>
            <span class="stat-value" id="tasks-high">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">Due Today</span>
            <span class="stat-value" id="tasks-today">-</span>
          </div>
        </div>
        <button class="button" onclick="viewTasks()">View All Tasks</button>
      </div>
      
      <div class="card">
        <h2>⏰ Schedule</h2>
        <div id="schedule-content">
          <div class="stat">
            <span class="stat-label">Active Jobs</span>
            <span class="stat-value" id="jobs-active">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">Next Run</span>
            <span class="stat-value" id="next-run">-</span>
          </div>
          <div class="stat">
            <span class="stat-label">Failed Jobs</span>
            <span class="stat-value" id="jobs-failed">-</span>
          </div>
        </div>
        <button class="button" onclick="viewSchedule()">Manage Schedule</button>
      </div>
    </div>
  </div>
  
  <script>
    async function fetchData(path) {
      try {
        const response = await fetch(\`?path=\${path}\`);
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch:', error);
        return null;
      }
    }
    
    async function refreshStatus() {
      const data = await fetchData('api/status');
      if (data) {
        document.getElementById('emails-today').textContent = data.emailsToday || 0;
        document.getElementById('emails-pending').textContent = data.emailsPending || 0;
        document.getElementById('last-run').textContent = data.lastRun || 'Never';
      }
    }
    
    async function processEmails() {
      if (confirm('Process emails now?')) {
        const response = await fetch('', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'processEmails' })
        });
        const result = await response.json();
        alert(result.message || 'Processing started');
        refreshStatus();
      }
    }
    
    async function viewTasks() {
      const data = await fetchData('api/tasks');
      console.log('Tasks:', data);
      // Implement task viewer
    }
    
    async function viewSchedule() {
      const data = await fetchData('api/schedule');
      console.log('Schedule:', data);
      // Implement schedule viewer
    }
    
    // Initial load
    refreshStatus();
  </script>
</body>
</html>
  `;
  
  return HtmlService.createHtmlOutput(template)
    .setTitle('GAS Personal Assistant')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Serve JSON response
 */
function serveJson(data: any, status: number = 200): GoogleAppsScript.Content.TextOutput {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Serve 404 page
 */
function serve404(): GoogleAppsScript.Content.TextOutput {
  return serveJson({ error: 'Not found' }, 404);
}

/**
 * Serve error response
 */
function serveError(error: any): GoogleAppsScript.Content.TextOutput {
  return serveJson({ 
    error: 'Internal server error', 
    message: error.toString() 
  }, 500);
}

/**
 * Check if request is authenticated
 */
function isAuthenticated(e: GoogleAppsScript.Events.DoPost): boolean {
  // Simple token-based auth
  const token = e.parameter.token;
  const validToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  
  return !validToken || token === validToken;
}

/**
 * Get system status
 */
function getSystemStatus(): any {
  try {
    const props = PropertiesService.getScriptProperties();
    
    return {
      status: 'active',
      version: Config.get('version'),
      environment: Config.get('environment'),
      emailsToday: parseInt(props.getProperty('EMAILS_TODAY') || '0'),
      emailsPending: parseInt(props.getProperty('EMAILS_PENDING') || '0'),
      lastRun: props.getProperty('LAST_RUN') || 'Never',
      features: Config.get('features')
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to get system status', error);
    return { error: 'Failed to get status' };
  }
}

/**
 * Get configuration
 */
function getConfiguration(): any {
  try {
    return {
      config: Config.get('features'),
      limits: Config.get('limits'),
      user: AuthManager.getCurrentUser()
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to get configuration', error);
    return { error: 'Failed to get configuration' };
  }
}

/**
 * Get tasks
 */
function getTasks(): any {
  try {
    const taskExtractor = new TaskExtractor();
    const tasks = taskExtractor.getPendingTasks();
    
    return {
      total: tasks.length,
      tasks: tasks.slice(0, 50) // Limit response size
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to get tasks', error);
    return { error: 'Failed to get tasks' };
  }
}

/**
 * Get schedule
 */
function getSchedule(): any {
  try {
    const scheduler = new Scheduler();
    return scheduler.getStatus();
  } catch (error) {
    Logger.error('WebApp', 'Failed to get schedule', error);
    return { error: 'Failed to get schedule' };
  }
}

/**
 * Process emails manually
 */
async function processEmailsManually(data: any): Promise<any> {
  try {
    const processor = new EmailProcessor();
    const gmailService = new GmailService();
    
    const emails = gmailService.getUnprocessedEmails(data.query || 'is:unread');
    const results = await processor.processBatch(emails);
    
    return {
      success: true,
      message: `Processed ${results.length} emails`,
      results: results
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to process emails manually', error);
    return { error: 'Failed to process emails' };
  }
}

/**
 * Update configuration
 */
function updateConfiguration(data: any): any {
  try {
    if (!AuthManager.hasPermission('configure')) {
      return { error: 'Permission denied' };
    }
    
    if (data.features) {
      Config.set('features', data.features);
    }
    
    if (data.limits) {
      Config.set('limits', data.limits);
    }
    
    return {
      success: true,
      message: 'Configuration updated',
      config: Config.get('features')
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to update configuration', error);
    return { error: 'Failed to update configuration' };
  }
}

/**
 * Update task
 */
function updateTask(data: any): any {
  try {
    const taskExtractor = new TaskExtractor();
    const success = taskExtractor.updateTaskStatus(data.taskId, data.status);
    
    return {
      success: success,
      message: success ? 'Task updated' : 'Task not found'
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to update task', error);
    return { error: 'Failed to update task' };
  }
}

/**
 * Run scheduled job
 */
function runScheduledJob(data: any): any {
  try {
    const scheduler = new Scheduler();
    const success = scheduler.runJobManually(data.jobId);
    
    return {
      success: success,
      message: success ? 'Job started' : 'Job not found'
    };
  } catch (error) {
    Logger.error('WebApp', 'Failed to run job', error);
    return { error: 'Failed to run job' };
  }
}
