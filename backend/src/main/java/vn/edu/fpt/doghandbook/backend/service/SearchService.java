package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.SearchHistoryResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchResultResponse;

import java.util.List;

public interface SearchService {

    List<SearchResultResponse> search(String keyword, String context, Integer userId);

    List<SearchHistoryResponse> getHistory(Integer userId);

    List<String> getSuggestions(Integer userId, String keyword);
}
