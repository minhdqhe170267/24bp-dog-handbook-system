package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResolveSessionRequest {

    @Size(max = 5000, message = "Ghi chú giải quyết tối đa 5000 ký tự")
    private String resolutionNotes;
}
