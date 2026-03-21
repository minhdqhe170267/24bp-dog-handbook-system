package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.SystemSettingResponse;

import java.util.List;
import java.util.Map;

public interface SystemSettingService {

    List<SystemSettingResponse> getAll();

    Map<String, List<SystemSettingResponse>> getAllGrouped();

    SystemSettingResponse getByKey(String key);

    SystemSettingResponse update(String key, String value);

    List<SystemSettingResponse> updateBatch(Map<String, String> settings);

    List<SystemSettingResponse> resetDefaults();

    // Typed getters for other services to use
    String getString(String key);

    int getInt(String key);

    boolean getBoolean(String key);
}
