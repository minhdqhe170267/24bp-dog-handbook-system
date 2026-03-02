package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BreedCompareRequest {

    @NotNull
    @Size(min = 2, max = 5)
    private List<Integer> breedIds;
}
