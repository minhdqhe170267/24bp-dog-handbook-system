package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.WeightAssessmentResponse;

public interface WeightAssessmentService {

    WeightAssessmentResponse assess(Integer dogId);
}
