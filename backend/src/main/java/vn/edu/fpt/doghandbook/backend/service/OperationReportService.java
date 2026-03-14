package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.OperationReportRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.OperationReportResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

public interface OperationReportService {

    PageResponse<OperationReportResponse> getAll(int page, int size, String type);

    PageResponse<OperationReportResponse> getByTrainer(Integer trainerId, int page, int size);

    OperationReportResponse getById(Integer reportId);

    OperationReportResponse create(OperationReportRequest request, Integer trainerId);

    OperationReportResponse update(Integer reportId, OperationReportRequest request, Integer trainerId);

    void delete(Integer reportId, Integer trainerId);
}
