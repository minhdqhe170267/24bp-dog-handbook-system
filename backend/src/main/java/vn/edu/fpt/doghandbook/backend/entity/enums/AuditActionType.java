package vn.edu.fpt.doghandbook.backend.entity.enums;

public enum AuditActionType {
    LOGIN,
    LOGIN_FAILED,
    LOGOUT,
    CHANGE_PASSWORD,

    CREATE,
    UPDATE,
    DELETE,

    APPROVE,
    REJECT,
    PUBLISH,
    UNPUBLISH,
    SUBMIT_FOR_REVIEW,

    LOCK_USER,
    UNLOCK_USER,
    ACTIVATE_USER,
    DEACTIVATE_USER,

    IMPORT_DATA,
    EXPORT_DATA,

    SYNC_PUSH,
    SYNC_PULL
}
