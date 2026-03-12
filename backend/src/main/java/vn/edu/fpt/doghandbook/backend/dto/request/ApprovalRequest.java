package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApprovalRequest {

    @NotNull
    private String decision;

    private String comments;
}
