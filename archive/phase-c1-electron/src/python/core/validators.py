"""
Input validation for file operations and user inputs.

Provides file size limits, path validation, and extension checking
to prevent common security and stability issues.
"""

import os
from pathlib import Path
from typing import List, Optional

from config.settings import FILES


class ValidationError(Exception):
    """Raised when validation fails."""

    pass


class FileValidator:
    """
    Validates file operations before execution.

    Features:
    - Size limit enforcement (default 500MB)
    - Path traversal prevention
    - Extension whitelist checking
    - Existence verification
    """

    # 500MB limit for audio files (from config.settings.FILES)
    MAX_FILE_SIZE = FILES.MAX_FILE_SIZE_BYTES

    # Allowed audio extensions (from config.settings.FILES)
    ALLOWED_EXTENSIONS = FILES.ALLOWED_EXTENSIONS

    @staticmethod
    def validate_file_size(file_path: str, max_size: Optional[int] = None) -> None:
        """
        Validate that file size is within limits.

        Args:
            file_path: Path to file to check
            max_size: Optional custom size limit in bytes

        Raises:
            ValidationError: If file exceeds size limit
            FileNotFoundError: If file doesn't exist
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        size_limit = max_size if max_size is not None else FileValidator.MAX_FILE_SIZE
        file_size = os.path.getsize(file_path)

        if file_size > size_limit:
            size_mb = file_size / (1024 * 1024)
            limit_mb = size_limit / (1024 * 1024)
            raise ValidationError(
                f"File size {size_mb:.1f}MB exceeds limit of {limit_mb:.1f}MB: {file_path}"
            )

    @staticmethod
    def validate_path_safety(file_path: str, base_dir: Optional[str] = None) -> None:
        """
        Validate path to prevent directory traversal attacks.

        Args:
            file_path: Path to validate
            base_dir: Optional base directory to restrict access to

        Raises:
            ValidationError: If path contains suspicious patterns or escapes base_dir
        """
        # Resolve to absolute path
        abs_path = os.path.abspath(file_path)

        # Check for suspicious patterns
        for pattern in FILES.DANGEROUS_PATH_PATTERNS:
            if pattern in file_path:
                raise ValidationError(
                    f"Path contains dangerous pattern '{pattern}': {file_path}"
                )

        # If base_dir specified, ensure path is within it
        if base_dir:
            abs_base = os.path.abspath(base_dir)
            if not abs_path.startswith(abs_base):
                raise ValidationError(
                    f"Path escapes base directory '{abs_base}': {abs_path}"
                )

    @staticmethod
    def validate_extension(
        file_path: str, allowed_extensions: Optional[List[str]] = None
    ) -> None:
        """
        Validate file extension against whitelist.

        Args:
            file_path: Path to file
            allowed_extensions: Optional custom list of allowed extensions (with dots)

        Raises:
            ValidationError: If extension not in whitelist
        """
        extensions = (
            allowed_extensions
            if allowed_extensions
            else FileValidator.ALLOWED_EXTENSIONS
        )

        file_ext = Path(file_path).suffix.lower()

        if file_ext not in extensions:
            raise ValidationError(
                f"Invalid file extension '{file_ext}'. Allowed: {', '.join(extensions)}"
            )

    @staticmethod
    def validate_file_exists(file_path: str) -> None:
        """
        Validate that file exists and is readable.

        Args:
            file_path: Path to file

        Raises:
            FileNotFoundError: If file doesn't exist
            PermissionError: If file isn't readable
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if not os.path.isfile(file_path):
            raise ValidationError(f"Path is not a file: {file_path}")

        if not os.access(file_path, os.R_OK):
            raise PermissionError(f"File not readable: {file_path}")

    @staticmethod
    def validate_directory_exists(dir_path: str, create: bool = False) -> None:
        """
        Validate that directory exists, optionally creating it.

        Args:
            dir_path: Path to directory
            create: If True, create directory if it doesn't exist

        Raises:
            FileNotFoundError: If directory doesn't exist and create=False
            PermissionError: If directory can't be created
        """
        if not os.path.exists(dir_path):
            if create:
                try:
                    os.makedirs(dir_path, exist_ok=True)
                except Exception as e:
                    raise PermissionError(f"Cannot create directory '{dir_path}': {e}")
            else:
                raise FileNotFoundError(f"Directory not found: {dir_path}")

        if not os.path.isdir(dir_path):
            raise ValidationError(f"Path is not a directory: {dir_path}")

        if not os.access(dir_path, os.W_OK):
            raise PermissionError(f"Directory not writable: {dir_path}")

    @staticmethod
    def validate_audio_file(file_path: str, base_dir: Optional[str] = None) -> None:
        """
        Comprehensive validation for audio files.

        Combines all checks: existence, size, extension, path safety.

        Args:
            file_path: Path to audio file
            base_dir: Optional base directory to restrict access to

        Raises:
            ValidationError: If any validation check fails
        """
        FileValidator.validate_path_safety(file_path, base_dir)
        FileValidator.validate_file_exists(file_path)
        FileValidator.validate_extension(file_path)
        FileValidator.validate_file_size(file_path)

    @staticmethod
    def validate_output_path(
        file_path: str, base_dir: Optional[str] = None, create_parent: bool = True
    ) -> None:
        """
        Validate output file path before writing.

        Args:
            file_path: Path where file will be written
            base_dir: Optional base directory to restrict access to
            create_parent: If True, create parent directory if needed

        Raises:
            ValidationError: If path is invalid or parent can't be created
        """
        FileValidator.validate_path_safety(file_path, base_dir)

        parent_dir = os.path.dirname(file_path)
        if parent_dir:
            FileValidator.validate_directory_exists(parent_dir, create=create_parent)
