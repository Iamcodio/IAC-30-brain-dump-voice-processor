"""
Centralized error handling using Observer pattern.

This module provides a singleton ErrorHandler that observers can subscribe to
for logging, notifications, and error recovery.
"""

import sys
import traceback
from enum import Enum
from typing import Callable, List, Optional
from datetime import datetime


class ErrorLevel(Enum):
    """Error severity levels."""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ErrorHandler:
    """
    Singleton error handler using Observer pattern.

    Observers can subscribe to receive error notifications with
    structured format: LEVEL:context:type:message
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._observers: List[Callable] = []
        self._error_count = 0
        self._initialized = True

    def subscribe(self, observer: Callable) -> None:
        """
        Subscribe an observer to error notifications.

        Args:
            observer: Callable that accepts (level, context, error_type, message)
        """
        if observer not in self._observers:
            self._observers.append(observer)

    def unsubscribe(self, observer: Callable) -> None:
        """Remove an observer from notifications."""
        if observer in self._observers:
            self._observers.remove(observer)

    def notify(
        self,
        level: ErrorLevel,
        context: str,
        error_type: str,
        message: str,
        exception: Optional[Exception] = None
    ) -> None:
        """
        Notify all observers of an error event.

        Args:
            level: Error severity level
            context: Where the error occurred (module/function name)
            error_type: Type of error (FileNotFound, ValidationError, etc.)
            message: Human-readable error description
            exception: Optional exception object for detailed logging
        """
        self._error_count += 1

        # Format: LEVEL:context:type:message
        formatted_message = f"{level.value}:{context}:{error_type}:{message}"

        # Notify all observers
        for observer in self._observers:
            try:
                observer(level, context, error_type, message, exception)
            except Exception as e:
                # Prevent observer errors from breaking the system
                print(f"ERROR:ErrorHandler:ObserverFailure:Observer failed: {e}", file=sys.stderr)

        # Always log to stderr for backup
        print(formatted_message, file=sys.stderr)

        # Print stack trace for errors and critical issues
        if exception and level in [ErrorLevel.ERROR, ErrorLevel.CRITICAL]:
            traceback.print_exception(type(exception), exception, exception.__traceback__, file=sys.stderr)

    def handle_exception(
        self,
        context: str,
        exception: Exception,
        fatal: bool = False
    ) -> None:
        """
        Handle an exception with automatic level determination.

        Args:
            context: Where the exception occurred
            exception: The caught exception
            fatal: If True, exit the process after logging
        """
        error_type = type(exception).__name__
        message = str(exception)

        level = ErrorLevel.CRITICAL if fatal else ErrorLevel.ERROR

        self.notify(level, context, error_type, message, exception)

        if fatal:
            sys.exit(1)

    def get_error_count(self) -> int:
        """Return total number of errors notified."""
        return self._error_count

    def reset_count(self) -> None:
        """Reset error counter (useful for testing)."""
        self._error_count = 0


# Default stderr observer
def stderr_observer(level: ErrorLevel, context: str, error_type: str, message: str, exception: Optional[Exception] = None) -> None:
    """
    Default observer that writes structured logs to stderr.

    Format: LEVEL:context:type:message
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {level.value}:{context}:{error_type}:{message}"
    print(log_line, file=sys.stderr, flush=True)


# Global singleton instance with default observer
error_handler = ErrorHandler()
error_handler.subscribe(stderr_observer)
