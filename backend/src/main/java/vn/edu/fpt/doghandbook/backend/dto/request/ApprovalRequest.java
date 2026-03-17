package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovalDecision;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class ApprovalRequest {

    @ValidEnum(enumClass = ApprovalDecision.class, message = "Quyết định không hợp lệ")
    private String decision;

    @Size(max = 5000, message = "Nhận xét tối đa 5000 ký tự")
    private String comments;

    @ValidEnum(enumClass = ApprovalDecision.class, message = "Hành động không hợp lệ")
    private String action;

    @Size(max = 5000, message = "Bình luận tối đa 5000 ký tự")
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
