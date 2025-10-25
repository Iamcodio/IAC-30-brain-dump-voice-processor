"""
Core error handling and validation module.

This package provides centralized error handling via Observer pattern
and input validation for the BrainDump Voice Processor.
"""

from .error_handler import ErrorHandler, ErrorLevel, error_handler
from .validators import FileValidator, ValidationError

__all__ = ['ErrorHandler', 'ErrorLevel', 'error_handler', 'FileValidator', 'ValidationError']
