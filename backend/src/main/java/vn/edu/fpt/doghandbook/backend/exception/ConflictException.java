package vn.edu.fpt.doghandbook.backend.exception;

/**
 * Raised when creating/updating violates uniqueness or state rules.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
