package vn.edu.fpt.doghandbook.backend.exception;

/**
 * Raised when a requested resource cannot be found.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
