package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.DogWeightRecordRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogWeightRecordResponse;

public interface DogWeightRecordService {

    DogWeightRecordResponse create(DogWeightRecordRequest request, Integer assessorId);
}
