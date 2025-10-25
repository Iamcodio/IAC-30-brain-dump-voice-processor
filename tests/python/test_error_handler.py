#!/usr/bin/env python3
"""Tests for error_handler.py - Observer pattern testing"""

import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'python'))
from core.error_handler import ErrorHandler, ErrorLevel, stderr_observer


class TestErrorHandler:
    """Test suite for ErrorHandler class using Observer pattern"""

    def setup_method(self):
        """Reset ErrorHandler singleton before each test"""
        # Create a new instance by resetting the singleton
        ErrorHandler._instance = None
        self.handler = ErrorHandler()

    def test_singleton_pattern(self):
        """Test that ErrorHandler is a singleton"""
        handler1 = ErrorHandler()
        handler2 = ErrorHandler()
        assert handler1 is handler2

    def test_subscribe_observer(self):
        """Test subscribing an observer"""
        observer = Mock()
        self.handler.subscribe(observer)
        assert observer in self.handler._observers

    def test_subscribe_duplicate_observer(self):
        """Test that duplicate observers are not added"""
        observer = Mock()
        self.handler.subscribe(observer)
        self.handler.subscribe(observer)
        assert self.handler._observers.count(observer) == 1

    def test_unsubscribe_observer(self):
        """Test unsubscribing an observer"""
        observer = Mock()
        self.handler.subscribe(observer)
        self.handler.unsubscribe(observer)
        assert observer not in self.handler._observers

    def test_unsubscribe_nonexistent_observer(self):
        """Test unsubscribing observer that was never added"""
        observer = Mock()
        # Should not raise exception
        self.handler.unsubscribe(observer)

    @patch('sys.stderr')
    def test_notify_calls_observers(self, mock_stderr):
        """Test that notify calls all subscribed observers"""
        observer1 = Mock()
        observer2 = Mock()

        self.handler.subscribe(observer1)
        self.handler.subscribe(observer2)

        self.handler.notify(
            ErrorLevel.ERROR,
            'test_context',
            'TestError',
            'Test message'
        )

        observer1.assert_called_once_with(
            ErrorLevel.ERROR,
            'test_context',
            'TestError',
            'Test message',
            None
        )
        observer2.assert_called_once_with(
            ErrorLevel.ERROR,
            'test_context',
            'TestError',
            'Test message',
            None
        )

    @patch('sys.stderr')
    def test_notify_increments_error_count(self, mock_stderr):
        """Test that error count is incremented"""
        initial_count = self.handler.get_error_count()
        self.handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg')
        assert self.handler.get_error_count() == initial_count + 1

    @patch('sys.stderr')
    def test_notify_with_exception(self, mock_stderr):
        """Test notify with exception object"""
        observer = Mock()
        self.handler.subscribe(observer)

        test_exception = ValueError("Test error")
        self.handler.notify(
            ErrorLevel.ERROR,
            'test_context',
            'ValueError',
            'Test message',
            test_exception
        )

        observer.assert_called_once()
        call_args = observer.call_args[0]
        assert call_args[4] == test_exception

    @patch('sys.stderr')
    def test_notify_handles_observer_exceptions(self, mock_stderr):
        """Test that exceptions in observers don't break the system"""
        failing_observer = Mock(side_effect=RuntimeError("Observer failed"))
        working_observer = Mock()

        self.handler.subscribe(failing_observer)
        self.handler.subscribe(working_observer)

        # Should not raise exception despite failing observer
        self.handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg')

        # Working observer should still be called
        working_observer.assert_called_once()

    @patch('sys.stderr')
    @patch('traceback.print_exception')
    def test_notify_prints_traceback_for_errors(self, mock_traceback, mock_stderr):
        """Test that traceback is printed for ERROR and CRITICAL levels"""
        test_exception = ValueError("Test error")

        self.handler.notify(
            ErrorLevel.ERROR,
            'test_context',
            'ValueError',
            'Test message',
            test_exception
        )

        mock_traceback.assert_called_once()

    @patch('sys.stderr')
    def test_notify_no_traceback_for_warnings(self, mock_stderr):
        """Test that traceback is not printed for WARNING level"""
        with patch('traceback.print_exception') as mock_traceback:
            test_exception = ValueError("Test error")

            self.handler.notify(
                ErrorLevel.WARNING,
                'test_context',
                'ValueError',
                'Test message',
                test_exception
            )

            mock_traceback.assert_not_called()

    @patch('sys.stderr')
    @patch('sys.exit')
    def test_handle_exception_fatal(self, mock_exit, mock_stderr):
        """Test handle_exception with fatal=True"""
        test_exception = RuntimeError("Fatal error")

        self.handler.handle_exception('test_context', test_exception, fatal=True)

        mock_exit.assert_called_once_with(1)

    @patch('sys.stderr')
    def test_handle_exception_non_fatal(self, mock_stderr):
        """Test handle_exception with fatal=False"""
        observer = Mock()
        self.handler.subscribe(observer)

        test_exception = RuntimeError("Non-fatal error")
        self.handler.handle_exception('test_context', test_exception, fatal=False)

        # Should notify with ERROR level
        call_args = observer.call_args[0]
        assert call_args[0] == ErrorLevel.ERROR

    def test_reset_count(self):
        """Test resetting error counter"""
        with patch('sys.stderr'):
            self.handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg')
            self.handler.notify(ErrorLevel.ERROR, 'ctx', 'type', 'msg')

            assert self.handler.get_error_count() > 0

            self.handler.reset_count()
            assert self.handler.get_error_count() == 0

    @patch('sys.stderr')
    def test_formatted_message_structure(self, mock_stderr):
        """Test that formatted message has correct structure"""
        self.handler.notify(
            ErrorLevel.WARNING,
            'my_context',
            'MyErrorType',
            'My error message'
        )

        # Check stderr was called with formatted message
        written_data = ''.join([call[0][0] for call in mock_stderr.write.call_args_list])
        assert 'WARNING:my_context:MyErrorType:My error message' in written_data


class TestErrorLevel:
    """Test ErrorLevel enum"""

    def test_error_levels_exist(self):
        """Test that all error levels are defined"""
        assert ErrorLevel.INFO.value == "INFO"
        assert ErrorLevel.WARNING.value == "WARNING"
        assert ErrorLevel.ERROR.value == "ERROR"
        assert ErrorLevel.CRITICAL.value == "CRITICAL"


class TestStderrObserver:
    """Test stderr_observer function"""

    @patch('sys.stderr')
    def test_stderr_observer_format(self, mock_stderr):
        """Test that stderr observer writes correctly formatted logs"""
        stderr_observer(
            ErrorLevel.ERROR,
            'test_context',
            'TestError',
            'Test message',
            None
        )

        # Verify stderr.write was called
        assert mock_stderr.write.called

        # Check that timestamp and message are in output
        written_data = ''.join([call[0][0] for call in mock_stderr.write.call_args_list])
        assert 'ERROR:test_context:TestError:Test message' in written_data

    @patch('sys.stderr')
    def test_stderr_observer_with_exception(self, mock_stderr):
        """Test stderr observer with exception object"""
        test_exception = ValueError("Test error")

        stderr_observer(
            ErrorLevel.ERROR,
            'test_context',
            'ValueError',
            'Test message',
            test_exception
        )

        assert mock_stderr.write.called


class TestGlobalErrorHandlerInstance:
    """Test the global error_handler instance"""

    def test_global_instance_exists(self):
        """Test that global error_handler is created"""
        from core.error_handler import error_handler
        assert error_handler is not None
        assert isinstance(error_handler, ErrorHandler)

    def test_global_instance_has_default_observer(self):
        """Test that default stderr_observer is subscribed"""
        from core.error_handler import error_handler
        assert stderr_observer in error_handler._observers
