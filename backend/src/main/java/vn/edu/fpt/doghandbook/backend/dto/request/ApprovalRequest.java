package vn.edu.fpt.doghandbook.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApprovalRequest {

    private String decision;
    private String comments;
    private String action;
    private String comment;

    public String resolveDecision() {
        if (decision != null && !decision.isBlank()) {
            return decision;
        }
        if (action != null && !action.isBlank()) {
            return action;
        }
        return null;
    }

    public String resolveComments() {
        if (comments != null && !comments.isBlank()) {
            return comments;
        }
        if (comment != null && !comment.isBlank()) {
            return comment;
        }
        return null;
    }
}
