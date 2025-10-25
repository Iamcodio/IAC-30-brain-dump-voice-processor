#!/usr/bin/env python3
"""Tests for validators.py - FileValidator testing"""

import pytest
import os
import tempfile
import sys
from pathlib import Path

# Add src/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'python'))
from core.validators import FileValidator, ValidationError


class TestFileValidator:
    """Test suite for FileValidator class"""

    def setup_method(self):
        """Create temporary directory for tests"""
        self.temp_dir = tempfile.mkdtemp()

    def teardown_method(self):
        """Clean up temporary directory"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def create_temp_file(self, filename, size_bytes=100):
        """Helper to create a temporary file with specified size"""
        filepath = os.path.join(self.temp_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(b'x' * size_bytes)
        return filepath

    # Test validate_file_size

    def test_validate_file_size_success(self):
        """Test validation passes for file within size limit"""
        filepath = self.create_temp_file('test.wav', 1024)
        # Should not raise exception
        FileValidator.validate_file_size(filepath)

    def test_validate_file_size_exceeds_default_limit(self):
        """Test validation fails when file exceeds 500MB default limit"""
        filepath = self.create_temp_file('large.wav', 1000)

        # Test with much smaller custom limit
        with pytest.raises(ValidationError, match="exceeds limit"):
            FileValidator.validate_file_size(filepath, max_size=100)

    def test_validate_file_size_custom_limit(self):
        """Test validation with custom size limit"""
        filepath = self.create_temp_file('test.wav', 500)

        # Should pass with larger limit
        FileValidator.validate_file_size(filepath, max_size=1000)

        # Should fail with smaller limit
        with pytest.raises(ValidationError):
            FileValidator.validate_file_size(filepath, max_size=100)

    def test_validate_file_size_nonexistent_file(self):
        """Test validation fails for non-existent file"""
        with pytest.raises(FileNotFoundError):
            FileValidator.validate_file_size('/nonexistent/file.wav')

    # Test validate_path_safety

    def test_validate_path_safety_normal_path(self):
        """Test validation passes for normal path"""
        filepath = os.path.join(self.temp_dir, 'normal.wav')
        # Should not raise exception
        FileValidator.validate_path_safety(filepath)

    def test_validate_path_safety_dotdot_pattern(self):
        """Test validation fails for path with .. pattern"""
        with pytest.raises(ValidationError, match="dangerous pattern"):
            FileValidator.validate_path_safety('/some/path/../evil.wav')

    def test_validate_path_safety_tilde_pattern(self):
        """Test validation fails for path with ~ pattern"""
        with pytest.raises(ValidationError, match="dangerous pattern"):
            FileValidator.validate_path_safety('~/evil.wav')

    def test_validate_path_safety_dollar_pattern(self):
        """Test validation fails for path with $ pattern"""
        with pytest.raises(ValidationError, match="dangerous pattern"):
            FileValidator.validate_path_safety('/path/$ENV_VAR/evil.wav')

    def test_validate_path_safety_within_base_dir(self):
        """Test validation passes when path is within base directory"""
        filepath = os.path.join(self.temp_dir, 'subdir', 'test.wav')
        # Should not raise exception
        FileValidator.validate_path_safety(filepath, base_dir=self.temp_dir)

    def test_validate_path_safety_escapes_base_dir(self):
        """Test validation fails when path escapes base directory"""
        outside_path = '/tmp/outside/file.wav'
        with pytest.raises(ValidationError, match="escapes base directory"):
            FileValidator.validate_path_safety(outside_path, base_dir=self.temp_dir)

    # Test validate_extension

    def test_validate_extension_allowed_wav(self):
        """Test validation passes for allowed .wav extension"""
        filepath = '/path/to/audio.wav'
        # Should not raise exception
        FileValidator.validate_extension(filepath)

    def test_validate_extension_allowed_mp3(self):
        """Test validation passes for allowed .mp3 extension"""
        filepath = '/path/to/audio.mp3'
        FileValidator.validate_extension(filepath)

    def test_validate_extension_disallowed(self):
        """Test validation fails for disallowed extension"""
        filepath = '/path/to/document.pdf'
        with pytest.raises(ValidationError, match="Invalid file extension"):
            FileValidator.validate_extension(filepath)

    def test_validate_extension_case_insensitive(self):
        """Test validation is case insensitive"""
        filepath = '/path/to/audio.WAV'
        # Should not raise exception
        FileValidator.validate_extension(filepath)

    def test_validate_extension_custom_whitelist(self):
        """Test validation with custom extension whitelist"""
        filepath = '/path/to/document.txt'
        custom_extensions = ['.txt', '.doc']
        # Should not raise exception
        FileValidator.validate_extension(filepath, allowed_extensions=custom_extensions)

    # Test validate_file_exists

    def test_validate_file_exists_success(self):
        """Test validation passes for existing file"""
        filepath = self.create_temp_file('exists.wav')
        # Should not raise exception
        FileValidator.validate_file_exists(filepath)

    def test_validate_file_exists_not_found(self):
        """Test validation fails for non-existent file"""
        with pytest.raises(FileNotFoundError):
            FileValidator.validate_file_exists('/nonexistent/file.wav')

    def test_validate_file_exists_is_directory(self):
        """Test validation fails when path is a directory"""
        with pytest.raises(ValidationError, match="not a file"):
            FileValidator.validate_file_exists(self.temp_dir)

    def test_validate_file_exists_not_readable(self):
        """Test validation fails for unreadable file"""
        filepath = self.create_temp_file('unreadable.wav')
        os.chmod(filepath, 0o000)

        try:
            with pytest.raises(PermissionError, match="not readable"):
                FileValidator.validate_file_exists(filepath)
        finally:
            # Restore permissions for cleanup
            os.chmod(filepath, 0o644)

    # Test validate_directory_exists

    def test_validate_directory_exists_success(self):
        """Test validation passes for existing directory"""
        # Should not raise exception
        FileValidator.validate_directory_exists(self.temp_dir)

    def test_validate_directory_exists_not_found_no_create(self):
        """Test validation fails when directory doesn't exist and create=False"""
        nonexistent_dir = os.path.join(self.temp_dir, 'nonexistent')
        with pytest.raises(FileNotFoundError):
            FileValidator.validate_directory_exists(nonexistent_dir, create=False)

    def test_validate_directory_exists_creates_directory(self):
        """Test directory is created when create=True"""
        new_dir = os.path.join(self.temp_dir, 'new_directory')
        # Should not raise exception and should create directory
        FileValidator.validate_directory_exists(new_dir, create=True)
        assert os.path.exists(new_dir)
        assert os.path.isdir(new_dir)

    def test_validate_directory_exists_is_file(self):
        """Test validation fails when path is a file"""
        filepath = self.create_temp_file('file.wav')
        with pytest.raises(ValidationError, match="not a directory"):
            FileValidator.validate_directory_exists(filepath)

    def test_validate_directory_exists_not_writable(self):
        """Test validation fails for non-writable directory"""
        readonly_dir = os.path.join(self.temp_dir, 'readonly')
        os.makedirs(readonly_dir)
        os.chmod(readonly_dir, 0o444)

        try:
            with pytest.raises(PermissionError, match="not writable"):
                FileValidator.validate_directory_exists(readonly_dir)
        finally:
            # Restore permissions for cleanup
            os.chmod(readonly_dir, 0o755)

    # Test validate_audio_file (comprehensive)

    def test_validate_audio_file_success(self):
        """Test comprehensive audio file validation passes"""
        filepath = self.create_temp_file('audio.wav', 1024)
        # Should not raise exception
        FileValidator.validate_audio_file(filepath, base_dir=self.temp_dir)

    def test_validate_audio_file_invalid_extension(self):
        """Test audio validation fails for invalid extension"""
        filepath = self.create_temp_file('document.txt', 100)
        with pytest.raises(ValidationError):
            FileValidator.validate_audio_file(filepath)

    def test_validate_audio_file_too_large(self):
        """Test audio validation fails for oversized file"""
        # Create a file and mock it as being too large
        filepath = self.create_temp_file('huge.wav', 100)

        with pytest.raises(ValidationError):
            # Override the size check with a tiny limit
            original_max = FileValidator.MAX_FILE_SIZE
            FileValidator.MAX_FILE_SIZE = 10
            try:
                FileValidator.validate_audio_file(filepath)
            finally:
                FileValidator.MAX_FILE_SIZE = original_max

    # Test validate_output_path

    def test_validate_output_path_success(self):
        """Test output path validation passes"""
        output_path = os.path.join(self.temp_dir, 'output.txt')
        # Should not raise exception
        FileValidator.validate_output_path(output_path, base_dir=self.temp_dir)

    def test_validate_output_path_creates_parent(self):
        """Test parent directory is created for output path"""
        output_path = os.path.join(self.temp_dir, 'new', 'nested', 'output.txt')
        FileValidator.validate_output_path(output_path, base_dir=self.temp_dir, create_parent=True)

        parent_dir = os.path.dirname(output_path)
        assert os.path.exists(parent_dir)
        assert os.path.isdir(parent_dir)

    def test_validate_output_path_no_create(self):
        """Test validation fails when parent doesn't exist and create_parent=False"""
        output_path = os.path.join(self.temp_dir, 'nonexistent', 'output.txt')
        with pytest.raises(FileNotFoundError):
            FileValidator.validate_output_path(output_path, base_dir=self.temp_dir, create_parent=False)

    def test_validate_output_path_dangerous_pattern(self):
        """Test output path validation fails for dangerous patterns"""
        with pytest.raises(ValidationError, match="dangerous pattern"):
            FileValidator.validate_output_path('../evil/output.txt')


class TestValidationError:
    """Test ValidationError exception"""

    def test_validation_error_is_exception(self):
        """Test that ValidationError is an Exception"""
        assert issubclass(ValidationError, Exception)

    def test_validation_error_message(self):
        """Test ValidationError with custom message"""
        error = ValidationError("Custom error message")
        assert str(error) == "Custom error message"
