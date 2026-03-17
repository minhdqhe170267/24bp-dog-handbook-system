package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.SymptomRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;

import java.util.List;

public interface SymptomService {

    List<SymptomResponse> getAll();

    List<SymptomResponse> getByCategory(String category);

    SymptomResponse getById(Integer id);

    SymptomResponse create(SymptomRequest request);

    SymptomResponse update(Integer id, SymptomRequest request);

    void delete(Integer id);
}
