package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.SymptomCheckerRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomCheckerResponse;

public interface SymptomCheckerService {

    SymptomCheckerResponse check(SymptomCheckerRequest request);
}
