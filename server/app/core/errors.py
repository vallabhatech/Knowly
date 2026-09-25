class AppError(Exception):
    """Base for user-facing errors. `code` is a stable identifier the client maps to copy."""

    code: str = "app_error"
    status_code: int = 500
    public_message: str = "Something went wrong. Please try again."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.public_message)
        self.message = message or self.public_message


class OcrTooShortError(AppError):
    code = "ocr_too_short"
    status_code = 422
    public_message = "We couldn't read this document — try a clearer photo."


class StorageError(AppError):
    code = "storage_error"
    status_code = 502
    public_message = "We couldn't save your file. Please try again."
