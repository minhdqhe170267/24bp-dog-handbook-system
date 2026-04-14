package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ResolutionType;

import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ConflictResolveRequest {

    @NotNull(message = "resolutionType is required")
    private ResolutionType resolutionType;

    private Map<String, Object> mergedData;

    private String resolutionNote;
}
