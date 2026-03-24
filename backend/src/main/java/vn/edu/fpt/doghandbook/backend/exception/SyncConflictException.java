package vn.edu.fpt.doghandbook.backend.exception;

import lombok.Getter;

@Getter
public class SyncConflictException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Object serverData;

    public SyncConflictException(String message, Object serverData) {
        super(message);
        this.errorCode = ErrorCode.SYNC_CONFLICT;
        this.serverData = serverData;
    }
}
