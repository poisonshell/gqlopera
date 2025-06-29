import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

class Logger {
  private level: LogLevel = 'info';
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    success: 1,
  };

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue('[INFO]'), ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('[WARN]'), ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('[ERROR]'), ...args);
    }
  }

  success(...args: unknown[]): void {
    if (this.shouldLog('success')) {
      console.log(chalk.green('[SUCCESS]'), ...args);
    }
  }
}

export const logger = new Logger(); 