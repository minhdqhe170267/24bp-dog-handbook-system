package vn.edu.fpt.doghandbook.backend.exception;

import lombok.Getter;

@Getter
public class SyncConflictException extends RuntimeException {

    private final Object serverData;

    public SyncConflictException(String message, Object serverData) {
        super(message);
        this.serverData = serverData;
    }
}
